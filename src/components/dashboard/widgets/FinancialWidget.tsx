import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FinancialWidget() {
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-widget'],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [receivables, payables] = await Promise.all([
        supabase
          .from('accounts_receivable')
          .select('amount, status, due_date')
          .gte('due_date', startDate)
          .lte('due_date', endDate),
        supabase
          .from('accounts_payable')
          .select('amount, status, due_date')
          .gte('due_date', startDate)
          .lte('due_date', endDate),
      ]);

      const totalReceivable = receivables.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const totalPayable = payables.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const paidReceivable = receivables.data?.filter(r => r.status === 'received').reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const paidPayable = payables.data?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        totalReceivable,
        totalPayable,
        paidReceivable,
        paidPayable,
        balance: totalReceivable - totalPayable,
        chartData: [
          { name: 'A Receber', valor: totalReceivable - paidReceivable },
          { name: 'Recebido', valor: paidReceivable },
          { name: 'A Pagar', valor: totalPayable - paidPayable },
          { name: 'Pago', valor: paidPayable },
        ],
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Resumo Financeiro - {format(new Date(), 'MMMM/yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">A Receber</p>
            <p className="text-lg font-bold text-blue-600">
              R$ {financialData?.totalReceivable.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">A Pagar</p>
            <p className="text-lg font-bold text-red-600">
              R$ {financialData?.totalPayable.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={`text-lg font-bold flex items-center gap-1 ${(financialData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(financialData?.balance || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              R$ {Math.abs(financialData?.balance || 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={financialData?.chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`} />
            <Bar dataKey="valor" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
