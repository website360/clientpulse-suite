import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type FilterType = 'a_receber' | 'a_pagar' | 'recebidas' | 'pagas';

export function FinancialAnalytics() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [filterType, setFilterType] = useState<FilterType>('a_receber');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['financial-analytics', selectedYear, filterType],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      // Buscar contas a receber
      const { data: receivableData } = await supabase
        .from('accounts_receivable')
        .select('amount, due_date, payment_date, status')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Buscar contas recebidas
      const { data: receivedData } = await supabase
        .from('accounts_receivable')
        .select('amount, payment_date, status')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('status', 'paid');

      // Buscar contas a pagar
      const { data: payableData } = await supabase
        .from('accounts_payable')
        .select('amount, due_date, payment_date, status')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      // Buscar contas pagas
      const { data: paidData } = await supabase
        .from('accounts_payable')
        .select('amount, payment_date, status')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('status', 'paid');

      // Calcular totais
      const totalAReceber = receivableData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const totalRecebidas = receivedData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const totalAPagar = payableData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalPagas = paidData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const caixa = totalRecebidas - totalPagas;

      // Agrupar por mês
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthStr = month.toString().padStart(2, '0');
        
        let value = 0;
        
        if (filterType === 'a_receber') {
          value = receivableData
            ?.filter(r => r.due_date.startsWith(`${selectedYear}-${monthStr}`))
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        } else if (filterType === 'a_pagar') {
          value = payableData
            ?.filter(p => p.due_date.startsWith(`${selectedYear}-${monthStr}`))
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        } else if (filterType === 'recebidas') {
          value = receivedData
            ?.filter(r => r.payment_date?.startsWith(`${selectedYear}-${monthStr}`))
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        } else if (filterType === 'pagas') {
          value = paidData
            ?.filter(p => p.payment_date?.startsWith(`${selectedYear}-${monthStr}`))
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        }

        return {
          month: new Date(Number(selectedYear), i).toLocaleDateString('pt-BR', { month: 'short' }),
          value,
        };
      });

      return {
        monthlyData,
        totals: {
          totalAReceber,
          totalRecebidas,
          totalAPagar,
          totalPagas,
          caixa,
        }
      };
    },
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getChartColor = () => {
    switch (filterType) {
      case 'a_receber':
        return 'hsl(142, 76%, 36%)';
      case 'recebidas':
        return 'hsl(142, 76%, 50%)';
      case 'a_pagar':
        return 'hsl(48, 96%, 53%)';
      case 'pagas':
        return 'hsl(0, 84%, 60%)';
      default:
        return 'hsl(var(--primary))';
    }
  };

  const getChartLabel = () => {
    switch (filterType) {
      case 'a_receber':
        return 'A Receber';
      case 'recebidas':
        return 'Recebidas';
      case 'a_pagar':
        return 'A Pagar';
      case 'pagas':
        return 'Pagas';
      default:
        return 'Valor';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      {!isLoading && analyticsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analyticsData.totals.totalAReceber)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(analyticsData.totals.totalRecebidas)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(analyticsData.totals.totalAPagar)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(analyticsData.totals.totalPagas)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Caixa (Lucro)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analyticsData.totals.caixa >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(analyticsData.totals.caixa)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Projeção Anual</CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="recebidas">Recebidas</SelectItem>
                  <SelectItem value="a_pagar">A Pagar</SelectItem>
                  <SelectItem value="pagas">Pagas</SelectItem>
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
              <BarChart data={analyticsData?.monthlyData}>
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
                  dataKey="value" 
                  fill={getChartColor()}
                  name={getChartLabel()}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
