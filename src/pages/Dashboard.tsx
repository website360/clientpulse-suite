import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Ticket, CheckCircle, Clock, Users, XCircle, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ContractsBarChart } from '@/components/charts/ContractsBarChart';

interface DashboardStats {
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalClients: number;
  totalContacts: number;
  totalReceivable: number;
  totalPayable: number;
  overdueAccounts: number;
  cashFlow: number;
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
    totalContacts: 0,
    totalReceivable: 0,
    totalPayable: 0,
    overdueAccounts: 0,
    cashFlow: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

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
          waitingTickets: tickets.filter(t => t.status === 'waiting').length,
          resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
          closedTickets: tickets.filter(t => t.status === 'closed').length,
        }));
      }

      // Fetch clients count (admin only)
      if (userRole === 'admin') {
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        const { count: contactsCount } = await supabase
          .from('client_contacts')
          .select('*', { count: 'exact', head: true });
        
        setStats(prev => ({ 
          ...prev, 
          totalClients: clientsCount || 0,
          totalContacts: contactsCount || 0 
        }));

        // Fetch financial data
        const today = new Date();
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
        const todayFormatted = format(today, 'yyyy-MM-dd');

        // Total a Receber (mês atual, pendente)
        const { data: receivableData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .eq('status', 'pending');

        const totalReceivable = receivableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Total a Pagar (mês atual, pendente)
        const { data: payableData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .eq('status', 'pending');

        const totalPayable = payableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Contas Vencidas (a pagar + a receber)
        const { data: overdueReceivable } = await supabase
          .from('accounts_receivable')
          .select('id')
          .lt('due_date', todayFormatted)
          .eq('status', 'pending');

        const { data: overduePayable } = await supabase
          .from('accounts_payable')
          .select('id')
          .lt('due_date', todayFormatted)
          .eq('status', 'pending');

        const overdueAccounts = (overdueReceivable?.length || 0) + (overduePayable?.length || 0);

        // Recebido no mês
        const { data: receivedData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd)
          .in('status', ['received']);

        const totalReceived = receivedData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Pago no mês
        const { data: paidData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd)
          .in('status', ['paid']);

        const totalPaid = paidData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        const cashFlow = totalReceived - totalPaid;

        setStats(prev => ({
          ...prev,
          totalReceivable,
          totalPayable,
          overdueAccounts,
          cashFlow,
        }));
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
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Aberto</p>
            <p className="text-2xl font-bold">{stats.openTickets}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Em Andamento</p>
            <p className="text-2xl font-bold">{stats.inProgressTickets}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Aguardando</p>
            <p className="text-2xl font-bold">{stats.waitingTickets}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Resolvido</p>
            <p className="text-2xl font-bold">{stats.resolvedTickets}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Fechado</p>
            <p className="text-2xl font-bold">{stats.closedTickets}</p>
          </div>
        </div>

        {userRole === 'admin' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground">Total de Contatos</p>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </div>
            </div>

            {/* Financial Indicators */}
            <div>
              <h2 className="text-xl font-bold mb-4">Indicadores Financeiros</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total a Receber"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalReceivable)}
                  icon={TrendingUp}
                  variant="success"
                />

                <MetricCard
                  title="Total a Pagar"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalPayable)}
                  icon={TrendingDown}
                  variant="destructive"
                />

                <MetricCard
                  title="Contas Vencidas"
                  value={stats.overdueAccounts}
                  icon={AlertCircle}
                  variant="destructive"
                />

                <MetricCard
                  title="Fluxo de Caixa"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.cashFlow)}
                  icon={DollarSign}
                  variant={stats.cashFlow >= 0 ? 'success' : 'destructive'}
                />
              </div>
            </div>
          </>
        )}

        {/* Activity and Recent Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityTimeline activities={activities} />
          
          {userRole === 'admin' && <ContractsBarChart />}
          
          <Card className={userRole === 'admin' ? 'lg:col-span-2' : ''}>
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
      </div>
    </DashboardLayout>
  );
}
