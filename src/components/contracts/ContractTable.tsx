import { useState } from 'react';
import { Pencil, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
}

export function ContractTable({ contracts, onEdit, onRefresh }: ContractTableProps) {
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      expired: 'secondary',
      cancelled: 'destructive',
    };

    const labels: Record<string, string> = {
      active: 'Ativo',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Meio de Pagamento</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableCell className="font-medium">
                    {contract.clients.company_name || contract.clients.full_name}
                  </TableCell>
                  <TableCell>{contract.services.name}</TableCell>
                  <TableCell>{formatCurrency(Number(contract.amount))}</TableCell>
                  <TableCell>{contract.payment_methods?.name || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {contract.end_date
                      ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Indeterminado'}
                  </TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
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
