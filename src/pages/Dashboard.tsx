import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Ticket, CheckCircle, Clock, Users, XCircle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ContractsBarChart } from '@/components/charts/ContractsBarChart';
import { DomainsBarChart } from '@/components/charts/DomainsBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalClients: number;
  totalContacts: number;
  totalReceivable: number;
  totalReceived: number;
  receivableDueSoon: number;
  overdueReceivable: number;
  totalPayable: number;
  totalPaid: number;
  payableDueSoon: number;
  overduePayable: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  assigned_to_profile?: {
    full_name: string;
  };
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    inProgressTickets: 0,
    waitingTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    totalClients: 0,
    totalContacts: 0,
    totalReceivable: 0,
    totalReceived: 0,
    receivableDueSoon: 0,
    overdueReceivable: 0,
    totalPayable: 0,
    totalPaid: 0,
    payableDueSoon: 0,
    overduePayable: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

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
        const threeDaysFromNow = format(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Total a Receber (mês atual, pendente)
        const { data: receivableData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .eq('status', 'pending');

        const totalReceivable = receivableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Total Recebido no mês
        const { data: receivedData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd)
          .in('status', ['received']);

        const totalReceived = receivedData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Contas a Receber que vencem em 3 dias
        const { data: receivableDueSoonData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .gte('due_date', todayFormatted)
          .lte('due_date', threeDaysFromNow)
          .eq('status', 'pending');

        const receivableDueSoon = receivableDueSoonData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Contas a Receber Vencidas
        const { data: overdueReceivableData } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .lt('due_date', todayFormatted)
          .eq('status', 'pending');

        const overdueReceivable = overdueReceivableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Total a Pagar (mês atual, pendente)
        const { data: payableData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .eq('status', 'pending');

        const totalPayable = payableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Total Pago no mês
        const { data: paidData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd)
          .in('status', ['paid']);

        const totalPaid = paidData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Contas a Pagar que vencem em 3 dias
        const { data: payableDueSoonData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .gte('due_date', todayFormatted)
          .lte('due_date', threeDaysFromNow)
          .eq('status', 'pending');

        const payableDueSoon = payableDueSoonData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        // Contas a Pagar Vencidas
        const { data: overduePayableData } = await supabase
          .from('accounts_payable')
          .select('amount')
          .lt('due_date', todayFormatted)
          .eq('status', 'pending');

        const overduePayable = overduePayableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        setStats(prev => ({
          ...prev,
          totalReceivable,
          totalReceived,
          receivableDueSoon,
          overdueReceivable,
          totalPayable,
          totalPaid,
          payableDueSoon,
          overduePayable,
        }));

        // Buscar últimas 5 tarefas
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)')
          .order('created_at', { ascending: false })
          .limit(5);

        // Buscar tarefas urgentes em atraso
        const now = new Date().toISOString();
        const { data: overdueData } = await supabase
          .from('tasks')
          .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)')
          .eq('priority', 'urgent')
          .lt('due_date', now)
          .neq('status', 'done')
          .order('due_date', { ascending: true });

        setRecentTasks(tasksData || []);
        setOverdueTasks(overdueData || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do sistema de gerenciamento
          </p>
        </div>

        {userRole === 'admin' && (
          <>
            {/* Client Indicators */}
            <div>
              <h2 className="text-lg font-bold mb-4">Indicadores de Clientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  title="Total de Clientes"
                  value={stats.totalClients}
                  icon={Users}
                  variant="default"
                />
                <MetricCard
                  title="Total de Contatos"
                  value={stats.totalContacts}
                  icon={Users}
                  variant="default"
                />
              </div>
            </div>

            {/* Financial Indicators - Contas a Receber */}
            <div>
              <h2 className="text-lg font-bold mb-4">Contas a Receber</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total a Receber"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalReceivable)}
                  icon={TrendingUp}
                  variant="default"
                />

                <MetricCard
                  title="Total Recebido"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalReceived)}
                  icon={CheckCircle}
                  variant="success"
                />

                <MetricCard
                  title="Vencem em 3 dias"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.receivableDueSoon)}
                  icon={Clock}
                  variant="default"
                />

                <MetricCard
                  title="Total Vencido"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.overdueReceivable)}
                  icon={AlertCircle}
                  variant="destructive"
                />
              </div>
            </div>

            {/* Financial Indicators - Contas a Pagar */}
            <div>
              <h2 className="text-lg font-bold mb-4">Contas a Pagar</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total a Pagar"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalPayable)}
                  icon={TrendingDown}
                  variant="default"
                />

                <MetricCard
                  title="Total Pago"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalPaid)}
                  icon={CheckCircle}
                  variant="success"
                />

                <MetricCard
                  title="Vencem em 3 dias"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.payableDueSoon)}
                  icon={Clock}
                  variant="default"
                />

                <MetricCard
                  title="Total Vencido"
                  value={new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.overduePayable)}
                  icon={AlertCircle}
                  variant="destructive"
                />
              </div>
            </div>
          </>
        )}

        {/* Ticket Indicators */}
        <div>
          <h2 className="text-lg font-bold mb-4">Indicadores de Tickets</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="Total de Tickets"
              value={stats.openTickets + stats.inProgressTickets + stats.waitingTickets + stats.resolvedTickets + stats.closedTickets}
              icon={Ticket}
              variant="default"
            />
            <MetricCard
              title="Aberto"
              value={stats.openTickets}
              icon={Ticket}
              variant="default"
            />
            <MetricCard
              title="Em Andamento"
              value={stats.inProgressTickets}
              icon={Clock}
              variant="default"
            />
            <MetricCard
              title="Aguardando"
              value={stats.waitingTickets}
              icon={Clock}
              variant="default"
            />
            <MetricCard
              title="Resolvido"
              value={stats.resolvedTickets}
              icon={CheckCircle}
              variant="default"
            />
            <MetricCard
              title="Fechado"
              value={stats.closedTickets}
              icon={XCircle}
              variant="default"
            />
          </div>
        </div>

        {/* Task Indicators */}
        {userRole === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Últimas Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa recente</p>
                ) : (
                  <div className="space-y-3">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.assigned_to_profile?.full_name || "Não atribuído"}
                          </p>
                        </div>
                        <Badge variant={task.status === "done" ? "default" : "secondary"}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Tarefas Urgentes em Atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente em atraso</p>
                ) : (
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.assigned_to_profile?.full_name || "Não atribuído"}
                          </p>
                          {task.due_date && (
                            <p className="text-xs text-destructive">
                              Venceu em: {format(new Date(task.due_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive">Atrasada</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        {userRole === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DomainsBarChart />
            <ContractsBarChart />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
