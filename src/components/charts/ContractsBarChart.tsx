import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const STATUS_COLORS = {
  pending_signature: '#a78bfa', // roxo suave
  active: '#34d399', // verde
  expiring: '#fbbf24', // amarelo
  expired: '#fb7185', // vermelho suave
  completed: '#60a5fa', // azul suave
};

const STATUS_LABELS = {
  pending_signature: 'Assinatura',
  active: 'Ativo',
  expiring: 'A Vencer',
  expired: 'Vencido',
  completed: 'Concluído',
};

interface ContractData {
  status: string;
  count: number;
  color: string;
  label: string;
}

export function ContractsBarChart() {
  const [data, setData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxValue, setMaxValue] = useState(0);

  useEffect(() => {
    fetchContractsData();
  }, []);

  const fetchContractsData = async () => {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('status, end_date');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calcular status dinâmico baseado nas datas
      const statusCount: Record<string, number> = {
        pending_signature: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        completed: 0,
      };

      contracts?.forEach(contract => {
        if (contract.status === 'completed') {
          statusCount.completed++;
          return;
        }

        if (contract.status === 'pending_signature') {
          statusCount.pending_signature++;
          return;
        }

        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          endDate.setHours(0, 0, 0, 0);
          
          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            statusCount.expired++;
          } else if (daysUntilExpiry <= 30) {
            statusCount.expiring++;
          } else {
            statusCount.active++;
          }
        } else {
          statusCount.active++;
        }
      });

      // Formatar dados para o gráfico
      const chartData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
        status: key,
        count: statusCount[key] || 0,
        color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
        label,
      }));

      const max = Math.max(...chartData.map(d => d.count), 1);
      setMaxValue(max);
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
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">{item.label}</span>
                <span className="font-bold" style={{ color: item.color }}>{item.count}</span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(item.count / maxValue) * 100}%`,
                    backgroundColor: item.color,
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
