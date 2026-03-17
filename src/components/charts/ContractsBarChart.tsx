import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <span className="text-sm font-semibold text-foreground">Contratos</span>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="h-2 bg-muted rounded-full animate-pulse" />
          <div className="h-2 bg-muted rounded-full w-3/4 animate-pulse" />
          <div className="h-2 bg-muted rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  const visibleData = data.filter((item) => item.count > 0);
  const displayData = visibleData.length > 0 ? visibleData : data;

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">Contratos</span>
        <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{total}</span>
      </div>

      {/* Items */}
      <div>
        {displayData.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between px-6 py-2.5",
              index < displayData.length - 1 && "border-b"
            )}
          >
            <span className="text-[13px] text-muted-foreground">{item.label}</span>
            <span className="text-[15px] font-semibold tabular-nums text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
