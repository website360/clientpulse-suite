import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  CreditCard,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/loading/DashboardSkeleton';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { QuickStatsGrid } from '@/components/dashboard/QuickStats';
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard';
import { ProjectsCarousel } from '@/components/dashboard/ProjectsCarousel';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { MaintenanceWidget } from '@/components/dashboard/MaintenanceWidget';
import { TicketsOverview } from '@/components/dashboard/TicketsOverview';
import { DomainsBarChart } from '@/components/charts/DomainsBarChart';
import { ContractsBarChart } from '@/components/charts/ContractsBarChart';

interface DashboardStats {
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
  maintenanceDone: number;
  maintenancePending: number;
  maintenanceOverdue: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  client?: {
    id: string;
    nickname: string;
  };
  assigned_to_profile?: {
    full_name: string;
  };
}

interface ProjectProgress {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  status: string;
  dueDate: string | null;
  projectType: string;
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const { preset, setPreset, dateRange } = useDateRangeFilter('month');
  
  const [stats, setStats] = useState<DashboardStats>({
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
    maintenanceDone: 0,
    maintenancePending: 0,
    maintenanceOverdue: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectProgress[]>([]);
  const [showReceivableValues, setShowReceivableValues] = useState(() => {
    const saved = localStorage.getItem('showReceivableValues');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showPayableValues, setShowPayableValues] = useState(() => {
    const saved = localStorage.getItem('showPayableValues');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    localStorage.setItem('showReceivableValues', JSON.stringify(showReceivableValues));
  }, [showReceivableValues]);

  useEffect(() => {
    localStorage.setItem('showPayableValues', JSON.stringify(showPayableValues));
  }, [showPayableValues]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        { count: waitingCount },
        { count: inProgressCount },
        { count: resolvedCount },
        { count: closedCount }
      ] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed')
      ]);

      setStats(prev => ({
        ...prev,
        inProgressTickets: inProgressCount || 0,
        waitingTickets: waitingCount || 0,
        resolvedTickets: resolvedCount || 0,
        closedTickets: closedCount || 0,
      }));

      if (userRole === 'admin') {
        const today = new Date();
        const rangeStart = format(dateRange.startDate, 'yyyy-MM-dd');
        const rangeEnd = format(dateRange.endDate, 'yyyy-MM-dd');
        const todayFormatted = format(today, 'yyyy-MM-dd');
        const threeDaysFromNow = format(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        const [
          { count: clientsCount },
          { count: contactsCount },
          { data: receivableData },
          { data: receivedData },
          { data: receivableDueSoonData },
          { data: overdueReceivableData },
          { data: payableData },
          { data: paidData },
          { data: payableDueSoonData },
          { data: overduePayableData },
          { data: tasksData },
          { data: overdueData },
          { data: maintenancePlans }
        ] = await Promise.all([
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('client_contacts').select('*', { count: 'exact', head: true }),
          supabase.from('accounts_receivable').select('amount, due_date').gte('due_date', rangeStart).lte('due_date', rangeEnd).eq('status', 'pending'),
          supabase.from('accounts_receivable').select('amount, payment_date').gte('payment_date', rangeStart).lte('payment_date', rangeEnd).in('status', ['received']),
          supabase.from('accounts_receivable').select('amount, due_date').gte('due_date', todayFormatted).lte('due_date', threeDaysFromNow).eq('status', 'pending'),
          supabase.from('accounts_receivable').select('amount, due_date').lt('due_date', todayFormatted).eq('status', 'pending'),
          supabase.from('accounts_payable').select('amount, due_date').gte('due_date', rangeStart).lte('due_date', rangeEnd).eq('status', 'pending'),
          supabase.from('accounts_payable').select('amount, payment_date').gte('payment_date', rangeStart).lte('payment_date', rangeEnd).in('status', ['paid']),
          supabase.from('accounts_payable').select('amount, due_date').gte('due_date', todayFormatted).lte('due_date', threeDaysFromNow).eq('status', 'pending'),
          supabase.from('accounts_payable').select('amount, due_date').lt('due_date', todayFormatted).eq('status', 'pending'),
          supabase.from('tasks').select('*, client:clients(id, nickname), assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
          supabase.from('tasks').select('*, client:clients(id, nickname), assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)').eq('priority', 'high').neq('status', 'done').order('created_at', { ascending: false }),
          supabase.from('client_maintenance_plans').select('*, maintenance_executions (executed_at)').eq('is_active', true).order('executed_at', { foreignTable: 'maintenance_executions', ascending: false })
        ]);

        const totalReceivable = receivableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const totalReceived = receivedData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const receivableDueSoon = receivableDueSoonData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const overdueReceivable = overdueReceivableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const totalPayable = payableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const totalPaid = paidData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const payableDueSoon = payableDueSoonData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;
        const overduePayable = overduePayableData?.reduce((sum, acc) => sum + Number(acc.amount), 0) || 0;

        setRecentTasks(tasksData || []);
        setOverdueTasks(overdueData || []);

        const todayMaintenance = new Date();
        todayMaintenance.setHours(0, 0, 0, 0);
        const currentMonthMaintenance = todayMaintenance.getMonth();
        const currentYearMaintenance = todayMaintenance.getFullYear();

        let maintenanceDone = 0;
        let maintenancePending = 0;
        let maintenanceOverdue = 0;

        maintenancePlans?.forEach((plan: any) => {
          const lastExecution = plan.maintenance_executions?.[0];
          const targetDay = plan.monthly_day;

          let nextScheduledDate: Date;
          if (lastExecution) {
            const lastDate = new Date(lastExecution.executed_at);
            const lastMonth = lastDate.getMonth();
            const lastYear = lastDate.getFullYear();
            if (lastMonth === currentMonthMaintenance && lastYear === currentYearMaintenance) {
              nextScheduledDate = new Date(currentYearMaintenance, currentMonthMaintenance + 1, targetDay);
            } else {
              nextScheduledDate = new Date(currentYearMaintenance, currentMonthMaintenance, targetDay);
            }
          } else if (plan.start_date) {
            const startDate = new Date(plan.start_date);
            nextScheduledDate = startDate > todayMaintenance ? startDate : new Date(currentYearMaintenance, currentMonthMaintenance, targetDay);
          } else {
            nextScheduledDate = new Date(currentYearMaintenance, currentMonthMaintenance, targetDay);
          }
          nextScheduledDate.setHours(0, 0, 0, 0);

          if (lastExecution) {
            const lastDate = new Date(lastExecution.executed_at);
            if (lastDate.getMonth() === currentMonthMaintenance && lastDate.getFullYear() === currentYearMaintenance) {
              maintenanceDone++;
              return;
            }
          }

          if (todayMaintenance > nextScheduledDate) {
            maintenanceOverdue++;
          } else {
            maintenancePending++;
          }
        });

        setStats(prev => ({
          ...prev,
          totalClients: clientsCount || 0,
          totalContacts: contactsCount || 0,
          totalReceivable,
          totalReceived,
          receivableDueSoon,
          overdueReceivable,
          totalPayable,
          totalPaid,
          payableDueSoon,
          overduePayable,
          maintenanceDone,
          maintenancePending,
          maintenanceOverdue,
        }));

        // Fetch active projects
        try {
          const projectsResult = await (supabase as any)
            .from('projects')
            .select('id, name, status, due_date, client_id, project_type_id')
            .in('status', ['em_andamento', 'planejamento']);

          const projectsData = projectsResult.data;
          const projectsError = projectsResult.error;

          if (projectsError) throw projectsError;

          if (projectsData && projectsData.length > 0) {
            const clientIds = projectsData.map((p: any) => p.client_id);
            const projectTypeIds = projectsData.map((p: any) => p.project_type_id).filter(Boolean);

            const [clientsResult, projectTypesResult] = await Promise.all([
              (supabase as any).from('clients').select('id, full_name, company_name, responsible_name').in('id', clientIds),
              (supabase as any).from('project_types').select('id, name').in('id', projectTypeIds)
            ]);

            const clientsData = clientsResult.data;
            const projectTypesData = projectTypesResult.data;

            const progressPromises = projectsData.map((project: any) => 
              supabase.rpc('calculate_project_progress', { project_id_param: project.id })
            );
            
            const progressResults = await Promise.all(progressPromises);

            const projectsWithProgress: ProjectProgress[] = projectsData.map((project: any, index: number) => {
              const progress = progressResults[index]?.data || 0;
              const client = clientsData?.find((c: any) => c.id === project.client_id);
              const clientName = client?.company_name || client?.responsible_name || client?.full_name || 'Cliente não identificado';
              const projectType = projectTypesData?.find((pt: any) => pt.id === project.project_type_id);
              const projectTypeName = projectType?.name || 'Tipo não definido';

              return {
                id: project.id,
                name: project.name,
                clientName,
                progress,
                status: project.status === 'em_andamento' ? 'Em Andamento' : 'Planejamento',
                dueDate: project.due_date,
                projectType: projectTypeName,
              };
            });

            setActiveProjects(projectsWithProgress);
          } else {
            setActiveProjects([]);
          }
        } catch (err) {
          console.error('Error fetching projects data:', err);
          setActiveProjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const quickStats = [
    {
      title: 'Clientes Ativos',
      value: stats.totalClients,
      icon: Users,
      color: 'blue' as const,
      subtitle: `${stats.totalContacts} contatos`,
    },
    {
      title: 'Receita do Período',
      value: formatCurrency(stats.totalReceived),
      icon: TrendingUp,
      color: 'emerald' as const,
    },
    {
      title: 'Despesas do Período',
      value: formatCurrency(stats.totalPaid),
      icon: TrendingDown,
      color: 'red' as const,
    },
    {
      title: 'Saldo Líquido',
      value: formatCurrency(stats.totalReceived - stats.totalPaid),
      icon: DollarSign,
      color: stats.totalReceived - stats.totalPaid >= 0 ? 'emerald' as const : 'red' as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Header with Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <DateRangeFilter
            preset={preset}
            onPresetChange={setPreset}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {userRole === 'admin' && (
              <>
                {/* Quick Stats */}
                <QuickStatsGrid stats={quickStats} columns={4} />

                {/* Financial Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  <FinancialSummaryCard
                    title="Contas a Receber"
                    icon={<ArrowUpRight className="h-5 w-5 text-emerald-600" />}
                    type="receivable"
                    showValues={showReceivableValues}
                    onToggleVisibility={() => setShowReceivableValues(!showReceivableValues)}
                    linkTo="/contas-a-receber"
                    items={[
                      { label: 'A Receber', value: stats.totalReceivable, variant: 'default' },
                      { label: 'Recebido', value: stats.totalReceived, variant: 'success' },
                      { label: 'Vence em 3 dias', value: stats.receivableDueSoon, variant: 'warning' },
                      { label: 'Vencido', value: stats.overdueReceivable, variant: 'danger' },
                    ]}
                  />
                  <FinancialSummaryCard
                    title="Contas a Pagar"
                    icon={<ArrowDownRight className="h-5 w-5 text-purple-600" />}
                    type="payable"
                    showValues={showPayableValues}
                    onToggleVisibility={() => setShowPayableValues(!showPayableValues)}
                    linkTo="/contas-a-pagar"
                    items={[
                      { label: 'A Pagar', value: stats.totalPayable, variant: 'default' },
                      { label: 'Pago', value: stats.totalPaid, variant: 'success' },
                      { label: 'Vence em 3 dias', value: stats.payableDueSoon, variant: 'warning' },
                      { label: 'Vencido', value: stats.overduePayable, variant: 'danger' },
                    ]}
                  />
                </div>

                {/* Tickets Overview */}
                <TicketsOverview
                  stats={{
                    waiting: stats.waitingTickets,
                    inProgress: stats.inProgressTickets,
                    resolved: stats.resolvedTickets,
                    closed: stats.closedTickets,
                  }}
                />

                {/* Projects Carousel */}
                <ProjectsCarousel projects={activeProjects} />

                {/* Tasks and Maintenance */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <TasksWidget 
                    recentTasks={recentTasks} 
                    urgentTasks={overdueTasks} 
                  />
                  <MaintenanceWidget
                    stats={{
                      done: stats.maintenanceDone,
                      pending: stats.maintenancePending,
                      overdue: stats.maintenanceOverdue,
                    }}
                  />
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <DomainsBarChart />
                  <ContractsBarChart />
                </div>
              </>
            )}

            {userRole !== 'admin' && (
              <TicketsOverview
                stats={{
                  waiting: stats.waitingTickets,
                  inProgress: stats.inProgressTickets,
                  resolved: stats.resolvedTickets,
                  closed: stats.closedTickets,
                }}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
