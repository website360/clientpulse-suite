import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  active: 'hsl(var(--accent))',
  expiring: 'hsl(45 93% 47%)',
  expired: 'hsl(0 84% 60%)',
};

const STATUS_LABELS = {
  active: 'Ativo',
  expiring: 'A Vencer',
  expired: 'Vencido',
};

interface DomainData {
  status: string;
  count: number;
  color: string;
  label: string;
}

interface DomainsBarChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function DomainsBarChart({ startDate, endDate }: DomainsBarChartProps) {
  const [data, setData] = useState<DomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxValue, setMaxValue] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDomainsData();
  }, [startDate, endDate]);

  const fetchDomainsData = async () => {
    try {
      const { data: domains, error } = await supabase
        .from('domains')
        .select('expires_at, created_at');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statusCount: Record<string, number> = {
        active: 0,
        expiring: 0,
        expired: 0,
      };

      domains?.forEach(domain => {
        if (domain.expires_at) {
          const expiresDate = new Date(domain.expires_at);
          expiresDate.setHours(0, 0, 0, 0);
          
          const daysUntilExpiry = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
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

      const chartData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
        status: key,
        count: statusCount[key] || 0,
        color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
        label,
      }));

      const max = Math.max(...chartData.map(d => d.count), 1);
      setMaxValue(max);
      setTotal(domains?.length || 0);
      setData(chartData);
    } catch (error) {
      console.error('Error fetching domains data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <span className="text-sm font-semibold text-foreground">Domínios</span>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="h-2 bg-muted rounded-full animate-pulse" />
          <div className="h-2 bg-muted rounded-full w-3/4 animate-pulse" />
          <div className="h-2 bg-muted rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">Domínios</span>
      </div>

      {/* Total */}
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] text-muted-foreground mb-1">Total registrados</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{total}</p>
      </div>

      {/* Items */}
      <div className="border-t">
        {data.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between px-6 py-3.5",
              index < data.length - 1 && "border-b"
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
