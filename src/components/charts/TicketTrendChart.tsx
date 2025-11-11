import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketTrendData {
  date: string;
  created: number;
  resolved: number;
  closed: number;
}

interface TicketTrendChartProps {
  data: TicketTrendData[];
}

export function TicketTrendChart({ data }: TicketTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tendência de Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Criados"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              name="Resolvidos"
              dot={{ fill: 'hsl(142 76% 36%)' }}
            />
            <Line
              type="monotone"
              dataKey="closed"
              stroke="hsl(215 20.2% 65.1%)"
              strokeWidth={2}
              name="Fechados"
              dot={{ fill: 'hsl(215 20.2% 65.1%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
