import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function ProductivityWidget() {
  const { data: productivityData, isLoading } = useQuery({
    queryKey: ['productivity-widget'],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('status, resolution_time_minutes, assigned_to')
        .gte('created_at', startDate);

      if (error) throw error;

      const totalTickets = tickets?.length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;
      const avgResolutionTime = tickets
        ?.filter(t => t.resolution_time_minutes)
        .reduce((sum, t) => sum + (t.resolution_time_minutes || 0), 0) / (resolvedTickets || 1);

      const statusData = [
        { name: 'Resolvido', value: tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0 },
        { name: 'Em Atendimento', value: tickets?.filter(t => t.status === 'in_progress').length || 0 },
        { name: 'Aguardando', value: tickets?.filter(t => t.status === 'waiting').length || 0 },
      ].filter(item => item.value > 0);

      return {
        totalTickets,
        resolvedTickets,
        avgResolutionTime,
        statusData,
        resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
      };
    },
  });

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Produtividade (Últimos 30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              Taxa de Resolução
            </div>
            <p className="text-2xl font-bold text-green-600">
              {productivityData?.resolutionRate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {productivityData?.resolvedTickets} de {productivityData?.totalTickets} tickets
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Tempo Médio
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatMinutes(productivityData?.avgResolutionTime || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              de resolução
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={productivityData?.statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {productivityData?.statusData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
