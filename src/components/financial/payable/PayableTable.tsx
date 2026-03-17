import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoreHorizontal, CheckCircle, XCircle, Edit, Trash2, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast, toastSuccess, toastError } from '@/hooks/use-toast';
import { PayableFormModal } from './PayableFormModal';
import { PayConfirmModal } from './PayConfirmModal';
import { BulkActionModal, type BulkActionType } from '../BulkActionModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PayableTableProps {
  filters: any;
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onTotalCountChange: (count: number) => void;
}

export function PayableTable({ filters, currentPage, pageSize, sortColumn, sortDirection, onSort, onTotalCountChange }: PayableTableProps) {
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
  const [payConfirmModal, setPayConfirmModal] = useState<{
    open: boolean;
    account: any;
  }>({ open: false, account: null });
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, [filters, currentPage, pageSize, sortColumn, sortDirection]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Count total
      let countQuery = supabase
        .from('accounts_payable')
        .select('*', { count: 'exact', head: true });
      
      if (filters.status !== 'all') {
        countQuery = countQuery.eq('status', filters.status);
      }
      if (filters.category !== 'all') {
        countQuery = countQuery.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        countQuery = countQuery.gte('due_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        countQuery = countQuery.lte('due_date', filters.dateTo);
      }
      if (filters.search) {
        countQuery = countQuery.ilike('description', `%${filters.search}%`);
      }

      const { count } = await countQuery;
      onTotalCountChange(count || 0);

      // Fetch paginated data
      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(name)
        `);

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

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      } else {
        query = query.order('due_date', { ascending: true });
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

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

  const handleMarkAsPaid = (account: any) => {
    setPayConfirmModal({ open: true, account });
  };

  const confirmPay = async (data: { id: string; payment_date: string; amount: number }) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ 
          status: 'paid',
          payment_date: data.payment_date,
          amount: data.amount
        })
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta marcada como paga'
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
      if (!account) throw new Error('Conta não encontrada na lista atual.');
      
      if (actionType === 'single') {
        const { error } = await supabase
          .from('accounts_payable')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } else if (actionType === 'following') {
        const parentId: string = account.parent_payable_id || (account.occurrence_type !== 'unica' ? account.id : '');
        if (!parentId) {
          const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
          if (error) throw error;
        } else {
          const { data: following, error: selErr } = await supabase
            .from('accounts_payable')
            .select('id, due_date, parent_payable_id')
            .eq('parent_payable_id', parentId)
            .gte('due_date', account.due_date);
          if (selErr) throw selErr;

          const idsToDelete = [id, ...(following?.map(r => r.id) || [])];
          if (idsToDelete.length) {
            const { error: delErr } = await supabase
              .from('accounts_payable')
              .delete()
              .in('id', idsToDelete);
            if (delErr) throw delErr;
          }
        }
      } else if (actionType === 'all') {
        const parentId: string = account.parent_payable_id || (account.occurrence_type !== 'unica' ? account.id : '');
        if (!parentId) {
          const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
          if (error) throw error;
        } else {
          const idsToDelete: string[] = [];

          const { data: parentRow, error: parentSelErr } = await supabase
            .from('accounts_payable')
            .select('id')
            .eq('id', parentId)
            .single();
          if (!parentSelErr && parentRow?.id) idsToDelete.push(parentRow.id);

          const { data: children, error: childrenSelErr } = await supabase
            .from('accounts_payable')
            .select('id')
            .eq('parent_payable_id', parentId);
          if (childrenSelErr) throw childrenSelErr;
          idsToDelete.push(...(children?.map(r => r.id) || []));

          if (idsToDelete.length === 0) idsToDelete.push(id);

          const { error: delErr } = await supabase
            .from('accounts_payable')
            .delete()
            .in('id', idsToDelete);
          if (delErr) throw delErr;
        }
      }

      toastSuccess('Sucesso', 'Conta(s) excluída(s) com sucesso');
      fetchAccounts();
    } catch (error: any) {
      toastError('Erro', error.message);
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

  const performEditUpdate = async (original: any, values: any, actionType: BulkActionType) => {
    try {
      const basePayableData: any = {
        supplier_id: values.supplier_id,
        description: values.description,
        category: values.category,
        payment_method: values.payment_method || null,
        notes: values.notes || null,
        occurrence_type: values.occurrence_type,
        due_day: values.due_day || null,
        installments: values.installments || null,
        issue_date: formatDateToString(values.issue_date),
      };

      const payload = {
        ...basePayableData,
        amount: parseFloat(values.amount),
        due_date: values.due_date ? formatDateToString(values.due_date) : formatDateToString(values.issue_date),
      };

      if (actionType === 'single') {
        const { error } = await supabase.from('accounts_payable').update(payload).eq('id', original.id);
        if (error) throw error;
      } else if (actionType === 'following') {
        const { error } = await supabase
          .from('accounts_payable')
          .update(payload)
          .eq('parent_payable_id', original.parent_payable_id || original.id)
          .gte('due_date', original.due_date);
        if (error) throw error;
      } else if (actionType === 'all') {
        const parentId = original.parent_payable_id || original.id;
        const { error } = await supabase
          .from('accounts_payable')
          .update(payload)
          .or(`id.eq.${parentId},parent_payable_id.eq.${parentId}`);
        if (error) throw error;
      }

      toastSuccess('Sucesso', 'Conta atualizada com sucesso');
      setEditingAccount(null);
      fetchAccounts();
    } catch (error: any) {
      toastError('Erro', error.message);
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
    
    if (status === 'paid') {
      return <Badge variant="default" className="bg-success">Pago</Badge>;
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
      <div className="space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('description')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição {sortColumn === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fornecedor</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort('category')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categoria {sortColumn === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ocorrência</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort('amount')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Valor {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('due_date')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Vencimento {sortColumn === 'due_date' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort('status')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Rows as Cards */}
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma conta encontrada</div>
        ) : (
          accounts.map((account, index) => (
            <Card 
              key={account.id}
              className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-2">
                  <p className="text-[14px] font-medium text-foreground truncate">{account.description}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[14px] text-foreground truncate">{account.supplier?.name}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-[14px] text-foreground truncate">{account.category}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[14px] text-foreground capitalize">
                    {account.occurrence_type === 'unica' ? 'Única' : account.occurrence_type}
                    {account.occurrence_type === 'parcelada' && account.installment_number && account.total_installments && (
                      <span className="ml-1">
                        {String(account.installment_number).padStart(2, '0')}/{String(account.total_installments).padStart(2, '0')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="col-span-1">
                  <p className="text-[14px] font-medium text-foreground">{formatCurrency(account.amount)}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {(() => {
                      const [y, m, d] = account.due_date.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </div>
                </div>
                <div className="col-span-1">
                  {getStatusBadge(account.status, account.due_date)}
                </div>
                <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                      <DropdownMenuItem onClick={() => handleEdit(account)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {account.status === 'pending' && (
                        <DropdownMenuItem onClick={() => handleMarkAsPaid(account)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Pago
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(account)}
                        className="text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
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
        )}
      </div>

      {editingAccount && (
        <PayableFormModal
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

      <PayConfirmModal
        open={payConfirmModal.open}
        onOpenChange={(open) => setPayConfirmModal({ ...payConfirmModal, open })}
        account={payConfirmModal.account}
        onConfirm={confirmPay}
      />
    </>
  );
}
