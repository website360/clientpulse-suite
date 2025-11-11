import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialTrendData {
  date: string;
  receivable: number;
  received: number;
  payable: number;
  paid: number;
}

interface FinancialTrendChartProps {
  data: FinancialTrendData[];
}

export function FinancialTrendChart({ data }: FinancialTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tendência Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorReceivable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPayable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              className="text-xs"
            />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="receivable"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorReceivable)"
              name="A Receber"
            />
            <Area
              type="monotone"
              dataKey="received"
              stroke="hsl(142 76% 36%)"
              fillOpacity={1}
              fill="url(#colorReceived)"
              name="Recebido"
            />
            <Area
              type="monotone"
              dataKey="payable"
              stroke="hsl(0 84% 60%)"
              fillOpacity={1}
              fill="url(#colorPayable)"
              name="A Pagar"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
