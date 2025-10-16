import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function FinancialAnalytics() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['financial-analytics', selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      // Buscar contas a receber
      const { data: receivableData } = await supabase
        .from('accounts_receivable')
        .select('amount, due_date')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Buscar contas a pagar
      const { data: payableData } = await supabase
        .from('accounts_payable')
        .select('amount, due_date')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Agrupar por mês
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthStr = month.toString().padStart(2, '0');
        
        const receivable = receivableData
          ?.filter(r => r.due_date.startsWith(`${selectedYear}-${monthStr}`))
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        
        const payable = payableData
          ?.filter(p => p.due_date.startsWith(`${selectedYear}-${monthStr}`))
          .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        return {
          month: new Date(Number(selectedYear), i).toLocaleDateString('pt-BR', { month: 'short' }),
          receber: receivable,
          pagar: payable,
        };
      });

      return monthlyData;
    },
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Projeção Anual - Contas a Pagar e Receber</CardTitle>
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
              <Bar 
                dataKey="receber" 
                fill="hsl(142, 76%, 36%)" 
                name="A Receber"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="pagar" 
                fill="hsl(48, 96%, 53%)" 
                name="A Pagar"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
