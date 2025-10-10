import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { PayableFormModal } from './PayableFormModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PayableTableProps {
  filters: any;
}

export function PayableTable({ filters }: PayableTableProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, [filters]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(name)
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

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ 
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conta excluída com sucesso'
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

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ocorrência</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.description}</TableCell>
                  <TableCell>{account.supplier?.name}</TableCell>
                  <TableCell>{account.category}</TableCell>
                  <TableCell className="capitalize">
                    {account.occurrence_type === 'unica' ? 'Única' : account.occurrence_type}
                    {account.occurrence_type === 'parcelada' && account.installment_number && account.total_installments && (
                      <span className="ml-1">
                        {String(account.installment_number).padStart(2, '0')}/{String(account.total_installments).padStart(2, '0')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(account.amount)}</TableCell>
                  <TableCell>
                    {format(new Date(account.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getStatusBadge(account.status, account.due_date)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {account.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(account.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(account.id)}
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
        <PayableFormModal
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          account={editingAccount}
          onSuccess={fetchAccounts}
        />
      )}
    </>
  );
}
