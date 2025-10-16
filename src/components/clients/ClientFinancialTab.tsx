import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, DollarSign } from 'lucide-react';

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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      received: { label: 'Recebido', variant: 'default' },
      paid: { label: 'Pago', variant: 'default' },
      overdue: { label: 'Vencido', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Agrupar por mês
  const groupedByMonth = receivables.reduce((acc, receivable) => {
    const monthYear = format(new Date(receivable.due_date), 'MMMM yyyy', { locale: ptBR });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(receivable);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedMonths = Object.entries(groupedByMonth).sort((a, b) => {
    const dateA = new Date(a[1][0].due_date);
    const dateB = new Date(b[1][0].due_date);
    return dateB.getTime() - dateA.getTime();
  });

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
    <div className="space-y-6">
      {sortedMonths.map(([monthYear, items]: [string, any[]]) => {
        return (
          <Card key={monthYear}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{monthYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((receivable: any) => (
                  <div
                    key={receivable.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{receivable.description}</p>
                        {getStatusBadge(receivable.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Vencimento: {format(new Date(receivable.due_date), 'dd/MM/yyyy')}</span>
                        </div>
                        {receivable.payment_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Pago em: {format(new Date(receivable.payment_date), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                        {receivable.category && (
                          <Badge variant="outline" className="text-xs">
                            {receivable.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(Number(receivable.amount))}
                      </div>
                      {receivable.payment_method && (
                        <p className="text-xs text-muted-foreground">{receivable.payment_method}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
