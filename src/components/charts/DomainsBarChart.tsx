import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const STATUS_COLORS = {
  active: '#34d399', // verde
  expiring: '#fbbf24', // amarelo
  expired: '#fb7185', // vermelho
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

export function DomainsBarChart() {
  const [data, setData] = useState<DomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxValue, setMaxValue] = useState(0);

  useEffect(() => {
    fetchDomainsData();
  }, []);

  const fetchDomainsData = async () => {
    try {
      const { data: domains, error } = await supabase
        .from('domains')
        .select('expires_at');

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
      setData(chartData);
    } catch (error) {
      console.error('Error fetching domains data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Domínios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Domínios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{item.label}</span>
                <span className="font-bold" style={{ color: item.color }}>{item.count}</span>
              </div>
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
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
