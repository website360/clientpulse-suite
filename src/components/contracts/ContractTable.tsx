import { useState } from 'react';
import { Pencil, Trash2, Download, Calendar, Building2, User } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
    nickname: string | null;
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
}

export function ContractTable({ contracts, onEdit, onRefresh, sortColumn, sortDirection, onSort }: ContractTableProps) {
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; contract: Contract | null }>({
    isOpen: false,
    contract: null,
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

  const getStatusBadge = (contract: Contract) => {
    const { status, end_date } = contract;
    
    // Apenas recalcular status baseado na data se o status for 'active'
    // Status definidos manualmente prevalecem
    let displayStatus = status;
    
    if (status === 'active' && end_date) {
      if (isExpired(end_date)) {
        displayStatus = 'expired';
      } else if (isExpiringSoon(end_date)) {
        displayStatus = 'expiring';
      }
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending_signature: 'secondary',
      active: 'default',
      expiring: 'outline',
      expired: 'destructive',
      completed: 'secondary',
    };

    const labels: Record<string, string> = {
      pending_signature: 'Assinatura',
      active: 'Ativo',
      expiring: 'A Vencer',
      expired: 'Vencido',
      completed: 'Concluído',
    };

    return (
      <Badge 
        variant={variants[displayStatus] || 'default'}
        className={displayStatus === 'expiring' ? 'border-warning text-warning' : ''}
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

  const isExpired = (endDate: string) => {
    const exp = parse(endDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {contract.clients.client_type === 'company' ? (
                          <Building2 className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {contract.clients.nickname || contract.clients.company_name || contract.clients.full_name}
                        </p>
                        {contract.clients.nickname && (
                          <p className="text-xs text-muted-foreground">
                            {contract.clients.company_name || contract.clients.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{contract.services.name}</TableCell>
                  <TableCell>{formatCurrency(Number(contract.amount))}</TableCell>
                  <TableCell>{contract.payment_methods?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {contract.end_date
                        ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Indeterminado'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(contract)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {contract.attachment_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadAttachment(contract.attachment_url!)}
                          title="Baixar anexo"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
