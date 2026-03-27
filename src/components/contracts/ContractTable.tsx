import { useState } from 'react';
import { Pencil, Trash2, Download, Calendar, Eye, X, RefreshCw, MoreVertical, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
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

    const labels: Record<string, string> = {
      pending_signature: 'Assinatura',
      active: 'Ativo',
      expiring: 'A Vencer',
      expiring_today: 'Vence Hoje',
      expired: 'Vencido',
      completed: 'Concluído',
    };

    const styles: Record<string, { badge: string; dot: string }> = {
      active: {
        badge: 'bg-green-50 text-green-700 border-0 hover:bg-green-50',
        dot: 'h-2 w-2 fill-green-500 text-green-500',
      },
      pending_signature: {
        badge: 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50',
        dot: 'h-2 w-2 fill-amber-500 text-amber-500',
      },
      expiring: {
        badge: 'bg-orange-50 text-orange-700 border-0 hover:bg-orange-50',
        dot: 'h-2 w-2 fill-orange-500 text-orange-500',
      },
      expiring_today: {
        badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50',
        dot: 'h-2 w-2 fill-red-500 text-red-500',
      },
      expired: {
        badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50',
        dot: 'h-2 w-2 fill-red-500 text-red-500',
      },
      completed: {
        badge: 'bg-gray-100 text-gray-600 border-0 hover:bg-gray-100',
        dot: 'h-2 w-2 fill-gray-400 text-gray-400',
      },
    };

    const style = styles[displayStatus] || styles.active;

    return (
      <Badge 
        variant="default"
        className={`${style.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}
      >
        <Circle className={style.dot} />
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

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-12 text-center">
        <p className="text-[13px] text-muted-foreground">Nenhum contrato encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Header Row */}
        <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-3 bg-muted/20 rounded-xl`}>
          {!hideClientColumn && (
            <div className="col-span-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente</span>
            </div>
          )}
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('service_id')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Serviço {sortColumn === 'service_id' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort('amount')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Valor {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pagamento</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('start_date')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Período {sortColumn === 'start_date' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('status')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Contract Rows as Cards */}
        {
          contracts.map((contract, index) => (
            <Card 
              key={contract.id}
              className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-4 items-center`}>
                {/* Cliente */}
                {!hideClientColumn && (
                  <div className="col-span-2">
                    <ClientNameCell client={contract.clients} />
                  </div>
                )}

                {/* Serviço */}
                <div className="col-span-2">
                  <p className="text-[14px] font-medium text-foreground">{contract.services.name}</p>
                </div>

                {/* Valor */}
                <div className="col-span-1">
                  <p className="text-[14px] font-medium text-foreground">{formatCurrency(Number(contract.amount))}</p>
                </div>

                {/* Pagamento */}
                <div className="col-span-2">
                  <p className="text-[14px] text-foreground">{contract.payment_methods?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{contract.payment_terms || ''}</p>
                </div>

                {/* Período */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {format(parse(contract.start_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy', { locale: ptBR })}
                      {' → '}
                      {contract.end_date
                        ? format(parse(contract.end_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy', { locale: ptBR })
                        : 'Indet.'}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  {getStatusBadge(contract)}
                </div>

                {/* Ações */}
                <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                      {contract.attachment_url && (
                        <>
                          <DropdownMenuItem onClick={() => viewPdf(contract.attachment_url!)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadAttachment(contract.attachment_url!)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar Anexo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(contract)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {shouldShowRenewButton(contract) && (
                        <DropdownMenuItem onClick={() => handleRenew(contract)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Renovar Contrato
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(contract)}
                        className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        }
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
