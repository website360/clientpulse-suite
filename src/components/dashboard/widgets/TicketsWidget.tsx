import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TicketsWidget() {
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets-widget'],
    queryFn: async () => {
      const dates = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

      const ticketsPromises = dates.map(async (date) => {
        const startDate = format(date, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('tickets')
          .select('priority, status')
          .gte('created_at', `${startDate} 00:00:00`)
          .lte('created_at', `${startDate} 23:59:59`);

        if (error) throw error;

        return {
          date: format(date, 'dd/MM'),
          total: data?.length || 0,
          urgente: data?.filter(t => t.priority === 'urgent').length || 0,
          alta: data?.filter(t => t.priority === 'high').length || 0,
          media: data?.filter(t => t.priority === 'medium').length || 0,
          baixa: data?.filter(t => t.priority === 'low').length || 0,
        };
      });

      return await Promise.all(ticketsPromises);
    },
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Tickets (Últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totalTickets = ticketsData?.reduce((sum, day) => sum + day.total, 0) || 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Tickets por Prioridade (Últimos 7 dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Total de Tickets</p>
            <p className="text-3xl font-bold">{totalTickets}</p>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Urgente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span>Baixa</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ticketsData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="urgente" stackId="a" fill="#ef4444" name="Urgente" />
            <Bar dataKey="alta" stackId="a" fill="#f59e0b" name="Alta" />
            <Bar dataKey="media" stackId="a" fill="#3b82f6" name="Média" />
            <Bar dataKey="baixa" stackId="a" fill="#9ca3af" name="Baixa" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
