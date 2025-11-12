import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CashFlowChartProps {
  data: Array<{
    name: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          className="text-xs"
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          className="text-xs"
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend />
        <Bar
          dataKey="receitas"
          fill="hsl(142 76% 36%)"
          name="Receitas"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="despesas"
          fill="hsl(0 84% 60%)"
          name="Despesas"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="saldo"
          fill="hsl(var(--primary))"
          name="Saldo"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
