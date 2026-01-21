import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Globe } from 'lucide-react';

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
      let query = supabase
        .from('domains')
        .select('expires_at, created_at');

      // Filter by creation date if date range is provided
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: domains, error } = await query;

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
      <Card className="border-border/50 transition-all duration-200 hover:shadow-md hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Domínios</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary" />
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
    <Card className="border-border/50 transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Domínios</CardTitle>
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
