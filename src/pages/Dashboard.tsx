import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Ticket, CheckCircle, Clock, Users, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TicketsLineChart } from '@/components/charts/TicketsLineChart';
import { PriorityPieChart } from '@/components/charts/PriorityPieChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';

interface DashboardStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalClients: number;
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    totalClients: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  // Mock data for charts - will be replaced with real data
  const lineChartData = [
    { date: '01/10', tickets: 12 },
    { date: '02/10', tickets: 19 },
    { date: '03/10', tickets: 15 },
    { date: '04/10', tickets: 25 },
    { date: '05/10', tickets: 22 },
    { date: '06/10', tickets: 30 },
    { date: '07/10', tickets: 28 },
  ];

  const pieChartData = [
    { name: 'Low', value: 10 },
    { name: 'Medium', value: 25 },
    { name: 'High', value: 15 },
    { name: 'Urgent', value: 8 },
  ];

  const activities = [
    {
      id: '1',
      type: 'message' as const,
      description: 'Respondeu ao ticket sobre problema de login',
      user: 'Admin',
      timestamp: '5 min atrás',
      ticketNumber: '1234',
    },
    {
      id: '2',
      type: 'status_change' as const,
      description: 'Marcou ticket como resolvido',
      user: 'Admin',
      timestamp: '15 min atrás',
      ticketNumber: '1233',
    },
    {
      id: '3',
      type: 'ticket_created' as const,
      description: 'Criou um novo ticket',
      user: 'João Silva',
      timestamp: '1 hora atrás',
      ticketNumber: '1235',
    },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch ticket stats
      const { data: tickets } = await supabase
        .from('tickets')
        .select('status');

      if (tickets) {
        setStats(prev => ({
          ...prev,
          openTickets: tickets.filter(t => t.status === 'open').length,
          inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
          resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        }));
      }

      // Fetch clients count (admin only)
      if (userRole === 'admin') {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        
        setStats(prev => ({ ...prev, totalClients: count || 0 }));
      }

      // Fetch recent tickets
      const { data: recent } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          subject,
          priority,
          status,
          created_at,
          clients (full_name, company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTickets(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'badge-priority-low',
      medium: 'badge-priority-medium',
      high: 'badge-priority-high',
      urgent: 'badge-priority-high',
    };
    return variants[priority] || 'badge-priority-medium';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved' || status === 'closed') return 'badge-status-resolved';
    return 'badge-status-open';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground shadow-lg">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Bem-vindo de volta! 👋</h1>
            <p className="text-primary-foreground/90 text-lg mb-6">
              Gerencie seus tickets e clientes de forma eficiente
            </p>
            <Button size="lg" variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              {userRole === 'admin' ? 'Novo Cliente' : 'Novo Ticket'}
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Tickets Abertos"
            value={stats.openTickets}
            icon={Ticket}
            trend={{ value: 'Requer atenção', isPositive: false }}
          />
          <MetricCard
            title="Em Andamento"
            value={stats.inProgressTickets}
            icon={Clock}
          />
          <MetricCard
            title="Resolvidos (7 dias)"
            value={stats.resolvedTickets}
            icon={CheckCircle}
            trend={{ value: '+12% vs semana passada', isPositive: true }}
          />
          {userRole === 'admin' && (
            <MetricCard
              title="Total de Clientes"
              value={stats.totalClients}
              icon={Users}
            />
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TicketsLineChart data={lineChartData} />
          <PriorityPieChart data={pieChartData} />
        </div>

        {/* Activity and Recent Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityTimeline activities={activities} />
          
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Tickets Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTickets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    Nenhum ticket encontrado
                  </p>
                ) : (
                  recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">#{ticket.ticket_number}</span>
                          <Badge className={getPriorityBadge(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusBadge(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.clients?.company_name || ticket.clients?.full_name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
