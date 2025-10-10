import { useState } from 'react';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contract {
  id: string;
  client_id: string;
  service_id: string;
  amount: number;
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; contractId: string | null }>({
    open: false,
    contractId: null,
  });

  const handleDelete = async () => {
    if (!deleteConfirmModal.contractId) return;

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', deleteConfirmModal.contractId);

    if (error) {
      toast.error('Erro ao excluir contrato');
      return;
    }

    toast.success('Contrato excluído com sucesso');
    setDeleteConfirmModal({ open: false, contractId: null });
    onRefresh();
  };

  const handleDownloadAttachment = async (attachmentUrl: string) => {
    const { data, error } = await supabase.storage
      .from('contract-attachments')
      .createSignedUrl(attachmentUrl, 60);

    if (error || !data) {
      toast.error('Erro ao baixar anexo');
      return;
    }

    window.open(data.signedUrl, '_blank');
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

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Término</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">
                {contract.clients.full_name || contract.clients.company_name}
              </TableCell>
              <TableCell>{contract.services.name}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(Number(contract.amount))}
              </TableCell>
              <TableCell>
                {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>
                {contract.end_date
                  ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(contract.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {contract.attachment_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadAttachment(contract.attachment_url!)}
                      title="Baixar anexo"
                    >
                      <FileText className="h-4 w-4" />
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
                    onClick={() => setDeleteConfirmModal({ open: true, contractId: contract.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {contracts.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum contrato encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AlertDialog
        open={deleteConfirmModal.open}
        onOpenChange={(open) => setDeleteConfirmModal({ open, contractId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
