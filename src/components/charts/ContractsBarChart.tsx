import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const STATUS_COLORS = {
  pending_signature: '#94a3b8',
  active: '#22c55e',
  expired: '#ef4444',
  completed: '#64748b',
};

const STATUS_LABELS = {
  pending_signature: 'Aguardando Assinatura',
  active: 'Ativo',
  expired: 'Vencido',
  completed: 'Concluído',
};

export function ContractsBarChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContractsData();
  }, []);

  const fetchContractsData = async () => {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('status');

      if (error) throw error;

      // Contar contratos por status
      const statusCount = contracts?.reduce((acc: any, contract) => {
        const status = contract.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Formatar dados para o gráfico
      const chartData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
        name: label,
        value: statusCount?.[key] || 0,
        color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching contracts data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contratos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
