import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type FilterType = 'pagas_recebidas' | 'pagar_receber' | 'atrasadas_vencidas' | 'caixa';

export function FinancialAnalytics() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [filterType, setFilterType] = useState<FilterType>('pagar_receber');

  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['financial-analytics', selectedYear, filterType],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const today = new Date().toISOString().split('T')[0];

      // Buscar todas as contas a receber
      const { data: allReceivableData } = await supabase
        .from('accounts_receivable')
        .select('amount, due_date, payment_date, status')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Buscar todas as contas a pagar
      const { data: allPayableData } = await supabase
        .from('accounts_payable')
        .select('amount, due_date, payment_date, status')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Agrupar por mês
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthStr = month.toString().padStart(2, '0');
        const monthStart = `${selectedYear}-${monthStr}`;
        
        const result: any = {
          month: new Date(Number(selectedYear), i).toLocaleDateString('pt-BR', { month: 'short' }),
        };

        if (filterType === 'pagas_recebidas') {
          // Contas recebidas no mês
          result.recebidas = allReceivableData
            ?.filter(r => (r.status === 'received' || r.status === 'paid') && r.payment_date?.startsWith(monthStart))
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
          
          // Contas pagas no mês
          result.pagas = allPayableData
            ?.filter(p => p.status === 'paid' && p.payment_date?.startsWith(monthStart))
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            
        } else if (filterType === 'pagar_receber') {
          // Contas a receber PENDENTES no mês
          result.receber = allReceivableData
            ?.filter(r => r.status === 'pending' && r.due_date.startsWith(monthStart))
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
          
          // Contas a pagar PENDENTES no mês
          result.pagar = allPayableData
            ?.filter(p => p.status === 'pending' && p.due_date.startsWith(monthStart))
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            
        } else if (filterType === 'atrasadas_vencidas') {
          // Contas a receber vencidas
          result.vencidas = allReceivableData
            ?.filter(r => r.due_date.startsWith(monthStart) && (r.status !== 'received' && r.status !== 'paid') && r.due_date < today)
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
          
          // Contas a pagar atrasadas
          result.atrasadas = allPayableData
            ?.filter(p => p.due_date.startsWith(monthStart) && p.status !== 'paid' && p.due_date < today)
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            
        } else if (filterType === 'caixa') {
          // Recebidas menos pagas = lucro
          const recebidas = allReceivableData
            ?.filter(r => (r.status === 'received' || r.status === 'paid') && r.payment_date?.startsWith(monthStart))
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
          
          const pagas = allPayableData
            ?.filter(p => p.status === 'paid' && p.payment_date?.startsWith(monthStart))
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          
          result.caixa = recebidas - pagas;
        }

        return result;
      });

      return monthlyData;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('financial-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts_receivable' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts_payable' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderBars = () => {
    switch (filterType) {
      case 'pagas_recebidas':
        return (
          <>
            <Bar dataKey="recebidas" fill="hsl(142, 76%, 50%)" name="Recebidas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pagas" fill="hsl(0, 84%, 60%)" name="Pagas" radius={[4, 4, 0, 0]} />
          </>
        );
      case 'pagar_receber':
        return (
          <>
            <Bar dataKey="receber" fill="hsl(142, 76%, 36%)" name="A Receber" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pagar" fill="hsl(0, 84%, 60%)" name="A Pagar" radius={[4, 4, 0, 0]} />
          </>
        );
      case 'atrasadas_vencidas':
        return (
          <>
            <Bar dataKey="vencidas" fill="hsl(0, 84%, 60%)" name="Vencidas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="atrasadas" fill="hsl(25, 95%, 53%)" name="Atrasadas" radius={[4, 4, 0, 0]} />
          </>
        );
      case 'caixa':
        return (
          <Bar 
            dataKey="caixa" 
            name="Caixa" 
            radius={[4, 4, 0, 0]}
            fill="hsl(142, 76%, 50%)"
          >
            {analyticsData?.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.caixa >= 0 ? 'hsl(142, 76%, 50%)' : 'hsl(0, 84%, 60%)'} 
              />
            ))}
          </Bar>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Projeção Anual</CardTitle>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pagas_recebidas">Pagas e Recebidas</SelectItem>
                <SelectItem value="pagar_receber">Pagar e Receber</SelectItem>
                <SelectItem value="atrasadas_vencidas">Atrasadas e Vencidas</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              {renderBars()}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
