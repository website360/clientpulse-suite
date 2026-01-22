import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

const STATUS_COLORS = {
  pending_signature: 'hsl(270 70% 70%)',
  active: 'hsl(var(--accent))',
  expiring_today: 'hsl(25 95% 53%)',
  expiring: 'hsl(45 93% 47%)',
  expired: 'hsl(0 84% 60%)',
  completed: 'hsl(210 80% 60%)',
};

const STATUS_LABELS = {
  pending_signature: 'Assinatura',
  active: 'Ativo',
  expiring_today: 'Vence Hoje',
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

interface ContractsBarChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function ContractsBarChart({ startDate, endDate }: ContractsBarChartProps) {
  const [data, setData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxValue, setMaxValue] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchContractsData();
  }, [startDate, endDate]);

  const fetchContractsData = async () => {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('status, end_date, start_date, created_at');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statusCount: Record<string, number> = {
        pending_signature: 0,
        active: 0,
        expiring_today: 0,
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

        if (contract.status === 'expired') {
          statusCount.expired++;
          return;
        }

        if (contract.status === 'expiring') {
          statusCount.expiring++;
          return;
        }

        if (contract.status === 'active') {
          if (contract.end_date) {
            const endDate = new Date(contract.end_date);
            endDate.setHours(0, 0, 0, 0);
            
            const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 0) {
              statusCount.expired++;
            } else if (daysUntilExpiry === 0) {
              statusCount.expiring_today++;
            } else if (daysUntilExpiry <= 30) {
              statusCount.expiring++;
            } else {
              statusCount.active++;
            }
          } else {
            statusCount.active++;
          }
        } else {
          statusCount.active++;
        }
      });

      const chartData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
        status: key,
        count: statusCount[key] || 0,
        color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
        label,
      }));

      const max = Math.max(...chartData.map(d => d.count), 1);
      setMaxValue(max);
      setTotal(contracts?.length || 0);
      setData(chartData);
    } catch (error) {
      console.error('Error fetching contracts data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Contratos</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-accent" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-2.5 bg-muted rounded-full" />
              <div className="h-2.5 bg-muted rounded-full w-3/4" />
              <div className="h-2.5 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Contratos</CardTitle>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-2.5 w-2.5 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-semibold">{item.count}</span>
              </div>
              <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(item.count / maxValue) * 100}%`,
                    backgroundColor: item.color,
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
