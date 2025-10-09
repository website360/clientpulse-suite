import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Ticket, CheckCircle, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema de suporte
          </p>
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

        {/* Recent Activity */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Tickets Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum ticket encontrado
                </p>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
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
    </DashboardLayout>
  );
}
