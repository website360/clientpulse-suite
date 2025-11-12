import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Ticket, CheckCircle, Clock, Users, XCircle, TrendingUp, TrendingDown, AlertCircle, Eye, EyeOff, Play, Wrench, FolderKanban, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ContractsBarChart } from '@/components/charts/ContractsBarChart';
import { DomainsBarChart } from '@/components/charts/DomainsBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardSkeleton } from '@/components/loading/DashboardSkeleton';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';

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
  const navigate = useNavigate();
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
      
      // Paralelizar contagem de tickets
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
        openTickets: 0,
        inProgressTickets: inProgressCount || 0,
        waitingTickets: waitingCount || 0,
        resolvedTickets: resolvedCount || 0,
        closedTickets: closedCount || 0,
      }));

      // Fetch clients count (admin only)
      if (userRole === 'admin') {
        const today = new Date();
        const rangeStart = format(dateRange.startDate, 'yyyy-MM-dd');
        const rangeEnd = format(dateRange.endDate, 'yyyy-MM-dd');
        const todayFormatted = format(today, 'yyyy-MM-dd');
        const threeDaysFromNow = format(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Paralelizar TODAS as requisições de dados administrativos
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
          { data: maintenancePlans },
          { data: ticketsCreatedData }
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
          supabase.from('client_maintenance_plans').select('*, maintenance_executions (executed_at)').eq('is_active', true).order('executed_at', { foreignTable: 'maintenance_executions', ascending: false }),
          supabase.from('tickets').select('created_at').gte('created_at', rangeStart).lte('created_at', rangeEnd)
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

          // Calcular próxima data
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

          // Verificar status
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


        // Buscar projetos ativos individuais
        try {
          const projectsResult = await (supabase as any)
            .from('projects')
            .select('id, name, status, due_date, client_id, project_type_id')
            .in('status', ['em_andamento', 'planejamento']);

          const projectsData = projectsResult.data;
          const projectsError = projectsResult.error;

          if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            throw projectsError;
          }

          console.log('Projects found:', projectsData?.length || 0);

          if (projectsData && projectsData.length > 0) {
            const projectIds = projectsData.map((p: any) => p.id);
            const clientIds = projectsData.map((p: any) => p.client_id);
            const projectTypeIds = projectsData.map((p: any) => p.project_type_id).filter(Boolean);

            const clientsResult = await (supabase as any)
              .from('clients')
              .select('id, full_name, company_name, responsible_name')
              .in('id', clientIds);

            const clientsData = clientsResult.data;
            const clientsError = clientsResult.error;

            if (clientsError) {
              console.error('Error fetching clients:', clientsError);
              throw clientsError;
            }

            const projectTypesResult = await (supabase as any)
              .from('project_types')
              .select('id, name')
              .in('id', projectTypeIds);

            const projectTypesData = projectTypesResult.data;

            // Buscar progresso real usando a função RPC para cada projeto
            const progressPromises = projectsData.map((project: any) => 
              supabase.rpc('calculate_project_progress', { project_id_param: project.id })
            );
            
            const progressResults = await Promise.all(progressPromises);

            // Criar array com progresso individual de cada projeto
            const projectsWithProgress: ProjectProgress[] = projectsData.map((project: any, index: number) => {
              const progress = progressResults[index]?.data || 0;

              const client = clientsData?.find((c: any) => c.id === project.client_id);
              const clientName = client?.company_name || client?.responsible_name || client?.full_name || 'Cliente não identificado';

              const projectType = projectTypesData?.find((pt: any) => pt.id === project.project_type_id);
              const projectTypeName = projectType?.name || 'Tipo não definido';

              console.log(`Project ${project.name}: ${progress}% completed`);

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

            console.log('Projects with progress:', projectsWithProgress);
            setActiveProjects(projectsWithProgress);
          } else {
            console.log('No projects found');
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

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'todo': 'A fazer',
      'in_progress': 'Em progresso',
      'done': 'Concluída',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema de gerenciamento</p>
            </div>
            <DateRangeFilter
              preset={preset}
              onPresetChange={setPreset}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </div>

        {/* Welcome Banner */}
        <WelcomeBanner />

        {loading && <DashboardSkeleton />}

        {userRole === 'admin' && !loading && (
          <>
            {/* Financial Indicators - Contas a Receber */}
            <div>
              <div className="flex items-center gap-3 mb-4" style={{ gap: 'var(--spacing-md)' }}>
                <h2 className="text-lg font-bold">Contas a Receber</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReceivableValues(!showReceivableValues)}
                >
                  {showReceivableValues ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4" style={{ gap: 'var(--gap-default)' }}>
                <MetricCard
                  title="Total a Receber"
                  value={showReceivableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalReceivable) : '•••••'}
                  icon={TrendingUp}
                  variant="default"
                />
                <MetricCard
                  title="Total Recebido"
                  value={showReceivableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalReceived) : '•••••'}
                  icon={CheckCircle}
                  variant="success"
                />
                <MetricCard
                  title="Vencem em 3 dias"
                  value={showReceivableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.receivableDueSoon) : '•••••'}
                  icon={Clock}
                  variant="default"
                />
                <MetricCard
                  title="Total Vencido"
                  value={showReceivableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.overdueReceivable) : '•••••'}
                  icon={AlertCircle}
                  variant="destructive"
                />
              </div>
            </div>

            {/* Financial Indicators - Contas a Pagar */}
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: 'var(--spacing-md)', gap: 'var(--spacing-md)' }}>
                <h2 className="text-lg font-bold">Contas a Pagar</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayableValues(!showPayableValues)}
                >
                  {showPayableValues ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4" style={{ gap: 'var(--gap-default)' }}>
                <MetricCard
                  title="Total a Pagar"
                  value={showPayableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalPayable) : '•••••'}
                  icon={TrendingDown}
                  variant="default"
                />
                <MetricCard
                  title="Total Pago"
                  value={showPayableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.totalPaid) : '•••••'}
                  icon={CheckCircle}
                  variant="success"
                />
                <MetricCard
                  title="Vencem em 3 dias"
                  value={showPayableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.payableDueSoon) : '•••••'}
                  icon={Clock}
                  variant="default"
                />
                <MetricCard
                  title="Total Vencido"
                  value={showPayableValues ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.overduePayable) : '•••••'}
                  icon={AlertCircle}
                  variant="destructive"
                />
              </div>
            </div>

            {/* Maintenance Indicators */}
            <div>
              <h2 className="text-lg font-bold" style={{ marginBottom: 'var(--spacing-md)' }}>Indicadores de Manutenção</h2>
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--gap-default)' }}>
                <MetricCard
                  title="Realizadas"
                  value={stats.maintenanceDone}
                  icon={CheckCircle}
                  variant="success"
                />
                <MetricCard
                  title="Aguardando"
                  value={stats.maintenancePending}
                  icon={Clock}
                  variant="default"
                />
                <MetricCard
                  title="Atrasadas"
                  value={stats.maintenanceOverdue}
                  icon={AlertCircle}
                  variant="destructive"
                />
              </div>
            </div>
          </>
        )}

        {/* Ticket Indicators */}
        <div>
          <h2 className="text-lg font-bold" style={{ marginBottom: 'var(--spacing-md)' }}>Indicadores de Tickets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'var(--gap-default)' }}>
            <MetricCard
              title="Aguardando"
              value={stats.waitingTickets}
              icon={Clock}
              variant="default"
            />
            <MetricCard
              title="Em Atendimento"
              value={stats.inProgressTickets}
              icon={Play}
              variant="default"
            />
            <MetricCard
              title="Resolvido"
              value={stats.resolvedTickets}
              icon={CheckCircle}
              variant="success"
            />
            <MetricCard
              title="Concluído"
              value={stats.closedTickets}
              icon={XCircle}
              variant="default"
            />
          </div>
        </div>


        {userRole === 'admin' && (
          <>
            {/* Projetos Ativos */}
            {activeProjects.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Projetos Ativos</h2>
                <div>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {activeProjects.map((project) => (
                      <CarouselItem key={project.id} className="md:basis-1/2 lg:basis-1/3">
                        <Link to={`/projetos/${project.id}`} className="block h-full">
                          <Card className="h-full transition-all duration-200 hover:shadow-lg cursor-pointer">
                            <CardHeader>
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {project.projectType}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <FolderKanban className="h-5 w-5" />
                                {project.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">{project.clientName}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Progresso Geral</span>
                                  <span className="font-semibold">{project.progress}%</span>
                                </div>
                                <Progress 
                                  value={project.progress} 
                                  className="h-2"
                                  indicatorClassName={
                                    project.progress >= 100 ? 'bg-green-500' :
                                    project.progress >= 75 ? 'bg-blue-500' :
                                    project.progress >= 50 ? 'bg-yellow-500' :
                                    project.progress >= 25 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }
                                />
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge variant={project.status === "Em Andamento" ? "default" : "secondary"}>
                                    {project.status}
                                  </Badge>
                                </div>
                              </div>
                              {project.dueDate && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  Prazo: {format(new Date(project.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      </CarouselItem>
                    ))}
                    </CarouselContent>
                    <div className="flex justify-end gap-2 mt-4">
                      <CarouselPrevious className="static translate-y-0" />
                      <CarouselNext className="static translate-y-0" />
                    </div>
                  </Carousel>
                </div>
              </div>
            )}
          </>
        )}

        {/* Task Indicators */}
        {userRole === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="urgent" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="recent">Últimas Tarefas</TabsTrigger>
                  <TabsTrigger value="urgent">Tarefas Urgentes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recent" className="mt-4">
                  {recentTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa recente</p>
                  ) : (
                    <div className="space-y-3">
                      {recentTasks.map((task) => (
                        <div key={task.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                          <div className="flex-1 space-y-1">
                            {task.client?.nickname && (
                              <p className="text-xs font-medium text-muted-foreground">
                                {task.client.nickname}
                              </p>
                            )}
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={task.status === "done" ? "default" : "secondary"}>
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="urgent" className="mt-4">
                  {overdueTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa urgente</p>
                  ) : (
                    <div className="space-y-3">
                      {overdueTasks.map((task) => (
                        <div key={task.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                          <div className="flex-1 space-y-1">
                            {task.client?.nickname && (
                              <p className="text-xs font-medium text-muted-foreground">
                                {task.client.nickname}
                              </p>
                            )}
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="destructive">Alta Prioridade</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
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
