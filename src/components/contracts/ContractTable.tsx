import { useState } from 'react';
import { Pencil, Trash2, Download, Calendar, Eye, X, RefreshCw } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Contract {
  id: string;
  client_id: string;
  service_id: string;
  amount: number;
  payment_method_id: string | null;
  payment_terms: string | null;
  attachment_url: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  clients: {
    full_name: string | null;
    company_name: string | null;
    responsible_name: string | null;
    client_type: 'person' | 'company';
  };
  services: {
    name: string;
  };
  payment_methods: {
    name: string;
  } | null;
}

interface ContractTableProps {
  contracts: Contract[];
  onEdit: (contract: Contract) => void;
  onRefresh: () => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  hideClientColumn?: boolean;
}

export function ContractTable({ contracts, onEdit, onRefresh, sortColumn, sortDirection, onSort, hideClientColumn = false }: ContractTableProps) {
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; contract: Contract | null }>({
    isOpen: false,
    contract: null,
  });
  const [pdfViewModal, setPdfViewModal] = useState<{ isOpen: boolean; url: string | null; filename: string | null; storagePath: string | null }>({
    isOpen: false,
    url: null,
    filename: null,
    storagePath: null,
  });

  const handleDelete = (contract: Contract) => {
    setDeleteConfirmModal({ isOpen: true, contract });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.contract) return;

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', deleteConfirmModal.contract.id);

    if (error) {
      toast.error('Erro ao excluir contrato');
      return;
    }

    toast.success('Contrato excluído com sucesso');
    setDeleteConfirmModal({ isOpen: false, contract: null });
    onRefresh();
  };

  const downloadAttachment = async (url: string) => {
    const { data, error } = await supabase.storage
      .from('contract-attachments')
      .download(url);

    if (error) {
      toast.error('Erro ao baixar anexo');
      return;
    }

    const blob = new Blob([data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = url.split('/').pop() || 'contrato';
    link.click();
  };

  const viewPdf = async (url: string) => {
    const { data, error } = await supabase.storage
      .from('contract-attachments')
      .createSignedUrl(url, 3600); // URL válida por 1 hora
    
    if (error) {
      toast.error('Erro ao gerar link do PDF');
      return;
    }
    
    setPdfViewModal({
      isOpen: true,
      url: data.signedUrl,
      filename: url.split('/').pop() || 'contrato',
      storagePath: url,
    });
  };

  const downloadFromModal = async () => {
    if (!pdfViewModal.storagePath) return;
    await downloadAttachment(pdfViewModal.storagePath);
  };

  const handleRenew = async (contract: Contract) => {
    if (!contract.end_date) {
      toast.error('Contrato sem data de vencimento');
      return;
    }

    try {
      // Parse da data evitando problemas de timezone
      const [year, month, day] = contract.end_date.split('-').map(Number);
      const currentEndDate = new Date(year, month - 1, day);
      
      // Adicionar 1 ano
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      
      // Formatar data no formato YYYY-MM-DD
      const newYear = newEndDate.getFullYear();
      const newMonth = String(newEndDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(newEndDate.getDate()).padStart(2, '0');
      const formattedEndDate = `${newYear}-${newMonth}-${newDay}`;

      const { error } = await supabase
        .from('contracts')
        .update({
          end_date: formattedEndDate,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast.success('Contrato renovado com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao renovar contrato:', error);
      toast.error('Erro ao renovar contrato');
    }
  };

  const getStatusBadge = (contract: Contract) => {
    const { status, end_date } = contract;
    
    // Apenas recalcular status baseado na data se o status for 'active'
    let displayStatus = status;
    
    if (status === 'active' && end_date) {
      if (isExpired(end_date)) {
        displayStatus = 'expired';
      } else if (isExpiringToday(end_date)) {
        displayStatus = 'expiring_today';
      } else if (isExpiringSoon(end_date)) {
        displayStatus = 'expiring';
      }
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending_signature: 'secondary',
      active: 'default',
      expiring: 'outline',
      expiring_today: 'outline',
      expired: 'destructive',
      completed: 'secondary',
    };

    const labels: Record<string, string> = {
      pending_signature: 'Assinatura',
      active: 'Ativo',
      expiring: 'A Vencer',
      expiring_today: 'Vence Hoje',
      expired: 'Vencido',
      completed: 'Concluído',
    };

    return (
      <Badge 
        variant={variants[displayStatus] || 'default'}
        className={displayStatus === 'expiring' || displayStatus === 'expiring_today' ? 'border-warning text-warning' : ''}
      >
        {labels[displayStatus] || displayStatus}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isExpiringSoon = (endDate: string) => {
    const exp = parse(endDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpiringToday = (endDate: string) => {
    const exp = parse(endDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp.getTime() === today.getTime();
  };

  const isExpired = (endDate: string) => {
    const exp = parse(endDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
  };

  const shouldShowRenewButton = (contract: Contract) => {
    if (!contract.end_date) return false;
    return isExpiringSoon(contract.end_date) || isExpiringToday(contract.end_date);
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {!hideClientColumn && <TableHead>Cliente</TableHead>}
              <SortableTableHead column="service_id" label="Serviço" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="amount" label="Valor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <TableHead>Meio de Pagamento</TableHead>
              <SortableTableHead column="start_date" label="Início" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="end_date" label="Vencimento" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum contrato encontrado
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.id}>
                  {!hideClientColumn && (
                    <TableCell>
                      <ClientNameCell client={contract.clients} />
                    </TableCell>
                  )}
                  <TableCell>{contract.services.name}</TableCell>
                  <TableCell>{formatCurrency(Number(contract.amount))}</TableCell>
                  <TableCell>{contract.payment_methods?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(parse(contract.start_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {contract.end_date
                        ? format(parse(contract.end_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Indeterminado'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(contract)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {shouldShowRenewButton(contract) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRenew(contract)}
                          title="Renovar contrato por mais 1 ano"
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Renovar
                        </Button>
                      )}
                      {contract.attachment_url && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewPdf(contract.attachment_url!)}
                            title="Visualizar PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadAttachment(contract.attachment_url!)}
                            title="Baixar anexo"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(contract)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contract)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={pdfViewModal.isOpen} onOpenChange={(open) => setPdfViewModal({ isOpen: open, url: null, filename: null, storagePath: null })}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>{pdfViewModal.filename}</DialogTitle>
              <DialogDescription className="sr-only">Visualização do PDF do contrato</DialogDescription>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadFromModal}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPdfViewModal({ isOpen: false, url: null, filename: null, storagePath: null })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/50">
            {pdfViewModal.url && (
              <iframe
                src={`${pdfViewModal.url}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title="Visualização do PDF"
                style={{ backgroundColor: '#525659' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirmModal.isOpen}
        onOpenChange={(open) => setDeleteConfirmModal({ isOpen: open, contract: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
