import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Ticket, CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalClients: number;
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    inProgressTickets: 0,
    waitingTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
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
          waitingTickets: tickets.filter(t => t.status === 'waiting').length,
          resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
          closedTickets: tickets.filter(t => t.status === 'closed').length,
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
          clients (full_name, company_name),
          departments (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTickets(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'low':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'waiting':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'resolved':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'closed':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Andamento';
      case 'waiting':
        return 'Aguardando';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema de tickets
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Total de Tickets</p>
            <p className="text-2xl font-bold">
              {stats.openTickets + stats.inProgressTickets + stats.waitingTickets + stats.resolvedTickets + stats.closedTickets}
            </p>
          </div>
          <div className="p-4 rounded-lg border-2 border-blue-500/40 bg-blue-500/10">
            <p className="text-sm text-blue-700">Aberto</p>
            <p className="text-2xl font-bold text-blue-600">{stats.openTickets}</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-amber-500/40 bg-amber-500/10">
            <p className="text-sm text-amber-700">Em Andamento</p>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgressTickets}</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-purple-500/40 bg-purple-500/10">
            <p className="text-sm text-purple-700">Aguardando</p>
            <p className="text-2xl font-bold text-purple-600">{stats.waitingTickets}</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-green-600/40 bg-green-600/10">
            <p className="text-sm text-green-700">Resolvido</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-gray-500/40 bg-gray-500/10">
            <p className="text-sm text-gray-700">Fechado</p>
            <p className="text-2xl font-bold text-gray-600">{stats.closedTickets}</p>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border-2 border-primary/40 bg-primary/10">
              <p className="text-sm text-primary/80">Total de Clientes</p>
              <p className="text-2xl font-bold text-primary">{stats.totalClients}</p>
            </div>
          </div>
        )}

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Tickets Criados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum ticket encontrado
                </p>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-all cursor-pointer"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{ticket.ticket_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ticket.departments?.name}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Cliente: {ticket.clients?.company_name || ticket.clients?.full_name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
