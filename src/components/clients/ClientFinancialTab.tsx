import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar } from 'lucide-react';

interface ClientFinancialTabProps {
  clientId: string;
}

export function ClientFinancialTab({ clientId }: ClientFinancialTabProps) {
  const { toast } = useToast();
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceivables();
  }, [clientId]);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      
      // Buscar faturas dos últimos 12 meses até o mês atual
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('client_id', clientId)
        .gte('due_date', format(startDate, 'yyyy-MM-dd'))
        .lte('due_date', format(endDate, 'yyyy-MM-dd'))
        .order('due_date', { ascending: false });

      if (error) throw error;
      setReceivables(data || []);
    } catch (error) {
      console.error('Error fetching receivables:', error);
      toast({
        title: 'Erro ao carregar faturas',
        description: 'Não foi possível carregar as faturas do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando faturas...</p>
      </div>
    );
  }

  if (receivables.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma fatura encontrada para este cliente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receivables.map((receivable: any) => (
            <TableRow key={receivable.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{receivable.description}</span>
                </div>
              </TableCell>
              <TableCell>
                {receivable.category ? (
                  <Badge variant="outline">{receivable.category}</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(receivable.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </TableCell>
              <TableCell>
                {receivable.payment_date ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(receivable.payment_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{getStatusBadge(receivable.status, receivable.due_date)}</TableCell>
              <TableCell className="text-right">
                <div>
                  <div className="font-semibold">{formatCurrency(Number(receivable.amount))}</div>
                  {receivable.payment_method && (
                    <p className="text-xs text-muted-foreground">{receivable.payment_method}</p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
