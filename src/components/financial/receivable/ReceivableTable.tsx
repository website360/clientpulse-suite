import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ReceivableFormModal } from './ReceivableFormModal';
import { BulkActionModal, type BulkActionType } from '../BulkActionModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceivableTableProps {
  filters: any;
}

export function ReceivableTable({ filters }: ReceivableTableProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [bulkActionModal, setBulkActionModal] = useState<{
    open: boolean;
    type: 'edit' | 'delete';
    account: any;
  }>({ open: false, type: 'edit', account: null });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    account: any;
  }>({ open: false, account: null });
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, [filters]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('accounts_receivable')
        .select(`
          *,
          client:clients(full_name, company_name, nickname)
        `)
        .order('due_date', { ascending: true });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar contas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({ 
          status: 'received',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta marcada como recebida'
      });
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (account: any) => {
    // Check if it's a recurring or installment payment
    const isRecurring = account.occurrence_type !== 'unica';
    
    if (isRecurring) {
      setBulkActionModal({ open: true, type: 'delete', account });
    } else {
      setDeleteConfirmModal({ open: true, account });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmModal.account) {
      await performDelete(deleteConfirmModal.account.id, 'single');
      setDeleteConfirmModal({ open: false, account: null });
    }
  };

  const performDelete = async (id: string, actionType: BulkActionType) => {
    try {
      const account = accounts.find(a => a.id === id);
      
      if (actionType === 'single') {
        const { error } = await supabase
          .from('accounts_receivable')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else if (actionType === 'following') {
        // Delete this and following installments/occurrences
        const { error } = await supabase
          .from('accounts_receivable')
          .delete()
          .eq('parent_receivable_id', account.parent_receivable_id || id)
          .gte('due_date', account.due_date);

        if (error) throw error;
      } else if (actionType === 'all') {
        // Delete all related installments/occurrences
        const parentId = account.parent_receivable_id || id;
        const { error } = await supabase
          .from('accounts_receivable')
          .delete()
          .or(`id.eq.${parentId},parent_receivable_id.eq.${parentId}`);

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Conta(s) excluída(s) com sucesso'
      });
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
  };

  const handleEditSaved = (formValues: any, isRecurring: boolean) => {
    if (isRecurring && editingAccount) {
      // Store the form values to apply after bulk action selection
      setBulkActionModal({ 
        open: true, 
        type: 'edit', 
        account: { ...editingAccount, formValues } 
      });
    } else {
      setEditingAccount(null);
      fetchAccounts();
    }
  };

  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return Number(val.toFixed(2));
    if (!val) return 0;
    // Handle Brazilian formats like 1.234,56
    const normalized = String(val).replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number((isNaN(num) ? 0 : num).toFixed(2));
  };

  const performEditUpdate = async (original: any, values: any, actionType: BulkActionType) => {
    try {
      const baseReceivableData: any = {
        client_id: values.client_id,
        description: values.description,
        category: values.category,
        payment_method: values.payment_method || null,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
        occurrence_type: values.occurrence_type,
        due_day: values.due_day || null,
        installments: values.installments || null,
        issue_date: formatDateToString(values.issue_date),
      };

      const payload = {
        ...baseReceivableData,
        amount: parseCurrency(values.amount),
        due_date: values.due_date ? formatDateToString(values.due_date) : formatDateToString(values.issue_date),
      };

      if (actionType === 'single') {
        const { error } = await supabase.from('accounts_receivable').update(payload).eq('id', original.id);
        if (error) throw error;
      } else if (actionType === 'following') {
        const { error } = await supabase
          .from('accounts_receivable')
          .update(payload)
          .eq('parent_receivable_id', original.parent_receivable_id || original.id)
          .gte('due_date', original.due_date);
        if (error) throw error;
      } else if (actionType === 'all') {
        const parentId = original.parent_receivable_id || original.id;
        // Update parent row
        const { data: parentUpdated, error: errParent } = await supabase
          .from('accounts_receivable')
          .update(payload)
          .eq('id', parentId)
          .select('id');
        if (errParent) throw errParent;
        // Update all children rows
        const { data: childrenUpdated, error: errChildren } = await supabase
          .from('accounts_receivable')
          .update(payload)
          .eq('parent_receivable_id', parentId)
          .select('id');
        if (errChildren) throw errChildren;
        console.log('[Receivable ALL] Updated rows:', {
          parentId,
          parentCount: parentUpdated?.length || 0,
          childrenCount: childrenUpdated?.length || 0,
        });
        if ((parentUpdated?.length || 0) + (childrenUpdated?.length || 0) === 0) {
          toast({ title: 'Aviso', description: 'Nenhuma cobrança foi atualizada.', variant: 'destructive' });
        }
      }

      toast({ title: 'Sucesso', description: 'Conta atualizada com sucesso' });
      setEditingAccount(null);
      fetchAccounts();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleBulkActionConfirm = (actionType: BulkActionType) => {
    if (bulkActionModal.type === 'edit') {
      const { formValues, ...original } = bulkActionModal.account || {};
      if (formValues) {
        performEditUpdate(original, formValues, actionType);
      }
      setBulkActionModal({ ...bulkActionModal, open: false });
    } else {
      // Delete action
      performDelete(bulkActionModal.account.id, actionType);
      setBulkActionModal({ ...bulkActionModal, open: false });
    }
  };
  const getStatusBadge = (status: string, dueDate: string) => {
    const parseLocalDate = (str: string) => {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseLocalDate(dueDate);
    due.setHours(0, 0, 0, 0);
    
    if (status === 'received') {
      return <Badge variant="default" className="bg-success">Recebido</Badge>;
    }
    if (status === 'canceled') {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    if (status === 'pending' && due < today) {
      return <Badge variant="outline" className="border-destructive text-destructive">Vencido</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ocorrência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.client?.nickname || account.client?.company_name || account.client?.full_name}
                  </TableCell>
                  <TableCell>{account.category}</TableCell>
                  <TableCell className="capitalize">
                    {account.occurrence_type === 'unica' ? 'Única' : account.occurrence_type}
                    {account.occurrence_type === 'parcelada' && account.installment_number && account.total_installments && (
                      <span className="ml-1">
                        {String(account.installment_number).padStart(2, '0')}/{String(account.total_installments).padStart(2, '0')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const [y, m, d] = account.due_date.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(account.amount)}</TableCell>
                  <TableCell>{getStatusBadge(account.status, account.due_date)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(account)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {account.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleMarkAsReceived(account.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Recebido
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(account)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingAccount && (
        <ReceivableFormModal
          open={!!editingAccount}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAccount(null);
              setBulkActionModal({ open: false, type: 'edit', account: null });
            }
          }}
          account={editingAccount}
          onSuccess={handleEditSaved}
        />
      )}

      <BulkActionModal
        open={bulkActionModal.open}
        onOpenChange={(open) => setBulkActionModal({ ...bulkActionModal, open })}
        actionType={bulkActionModal.type}
        occurrenceType={bulkActionModal.account?.occurrence_type || ''}
        onConfirm={handleBulkActionConfirm}
      />

      <AlertDialog open={deleteConfirmModal.open} onOpenChange={(open) => setDeleteConfirmModal({ ...deleteConfirmModal, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
