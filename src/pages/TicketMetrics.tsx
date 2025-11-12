import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCachedDepartments } from '@/hooks/useCachedDepartments';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/loading/DashboardSkeleton';

interface TicketMetrics {
  avgResponseTime: number;
  avgResolutionTime: number;
  slaComplianceRate: number;
  avgRating: number;
  totalTickets: number;
  ticketsWithSLA: number;
  ticketsWithRating: number;
  slaBreached: number;
  priorityDistribution: Array<{ name: string; value: number }>;
  dailyMetrics: Array<{
    date: string;
    responseTime: number;
    resolutionTime: number;
    slaCompliance: number;
  }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

export default function TicketMetrics() {
  const [metrics, setMetrics] = useState<TicketMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const { toast } = useToast();
  const { preset, setPreset, dateRange, setCustomRange } = useDateRangeFilter('month');
  const { data: departments } = useCachedDepartments();

  useEffect(() => {
    fetchMetrics();
  }, [dateRange, selectedDepartment]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Build query
      let ticketsQuery = supabase
        .from('tickets')
        .select('*')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (selectedDepartment !== 'all') {
        ticketsQuery = ticketsQuery.eq('department_id', selectedDepartment);
      }

      const { data: tickets, error } = await ticketsQuery;

      if (error) throw error;

      // Fetch SLA tracking and ratings separately
      const ticketIds = tickets?.map(t => t.id) || [];
      
      const { data: slaTracking } = await supabase
        .from('ticket_sla_tracking')
        .select('*')
        .in('ticket_id', ticketIds);

      const { data: ratings } = await supabase
        .from('ticket_ratings')
        .select('*')
        .in('ticket_id', ticketIds);

      // Map SLA and ratings to tickets
      const ticketsWithData = tickets?.map(ticket => ({
        ...ticket,
        sla: slaTracking?.find(sla => sla.ticket_id === ticket.id),
        rating: ratings?.find(r => r.ticket_id === ticket.id),
      }));

      // Calculate metrics
      const totalTickets = ticketsWithData?.length || 0;
      
      const ticketsWithResponse = ticketsWithData?.filter(t => t.response_time_minutes) || [];
      const avgResponseTime = ticketsWithResponse.length > 0
        ? ticketsWithResponse.reduce((sum, t) => sum + (t.response_time_minutes || 0), 0) / ticketsWithResponse.length
        : 0;

      const ticketsWithResolution = ticketsWithData?.filter(t => t.resolution_time_minutes) || [];
      const avgResolutionTime = ticketsWithResolution.length > 0
        ? ticketsWithResolution.reduce((sum, t) => sum + (t.resolution_time_minutes || 0), 0) / ticketsWithResolution.length
        : 0;

      const ticketsWithSLA = ticketsWithData?.filter(t => t.sla) || [];
      const slaBreached = ticketsWithSLA.filter(t => 
        t.sla?.first_response_breached || 
        t.sla?.resolution_breached
      ).length;
      const slaComplianceRate = ticketsWithSLA.length > 0
        ? ((ticketsWithSLA.length - slaBreached) / ticketsWithSLA.length) * 100
        : 0;

      const ticketsWithRating = ticketsWithData?.filter(t => t.rating) || [];
      const avgRating = ticketsWithRating.length > 0
        ? ticketsWithRating.reduce((sum, t) => sum + (t.rating?.rating || 0), 0) / ticketsWithRating.length
        : 0;

      // Priority distribution
      const priorityCounts: Record<string, number> = {};
      ticketsWithData?.forEach(t => {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });
      const priorityDistribution = Object.entries(priorityCounts).map(([name, value]) => ({
        name: name === 'low' ? 'Baixa' : name === 'medium' ? 'Média' : name === 'high' ? 'Alta' : 'Urgente',
        value
      }));

      // Rating distribution
      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ticketsWithRating.forEach(t => {
        const rating = t.rating?.rating;
        if (rating) ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
      });
      const ratingDistribution = Object.entries(ratingCounts).map(([rating, count]) => ({
        rating: parseInt(rating),
        count
      }));

      // Daily metrics (grouped by date)
      const dailyData: Record<string, { responseSum: number; responseCount: number; resolutionSum: number; resolutionCount: number; slaTotal: number; slaCompliant: number }> = {};
      
      ticketsWithData?.forEach(t => {
        const date = format(new Date(t.created_at), 'yyyy-MM-dd');
        if (!dailyData[date]) {
          dailyData[date] = { responseSum: 0, responseCount: 0, resolutionSum: 0, resolutionCount: 0, slaTotal: 0, slaCompliant: 0 };
        }
        
        if (t.response_time_minutes) {
          dailyData[date].responseSum += t.response_time_minutes;
          dailyData[date].responseCount++;
        }
        
        if (t.resolution_time_minutes) {
          dailyData[date].resolutionSum += t.resolution_time_minutes;
          dailyData[date].resolutionCount++;
        }
        
        if (t.sla) {
          dailyData[date].slaTotal++;
          if (!t.sla.first_response_breached && !t.sla.resolution_breached) {
            dailyData[date].slaCompliant++;
          }
        }
      });

      const dailyMetrics = Object.entries(dailyData).map(([date, data]) => ({
        date,
        responseTime: data.responseCount > 0 ? data.responseSum / data.responseCount : 0,
        resolutionTime: data.resolutionCount > 0 ? data.resolutionSum / data.resolutionCount : 0,
        slaCompliance: data.slaTotal > 0 ? (data.slaCompliant / data.slaTotal) * 100 : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setMetrics({
        avgResponseTime,
        avgResolutionTime,
        slaComplianceRate,
        avgRating,
        totalTickets,
        ticketsWithSLA: ticketsWithSLA.length,
        ticketsWithRating: ticketsWithRating.length,
        slaBreached,
        priorityDistribution,
        dailyMetrics,
        ratingDistribution,
      });
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Erro ao carregar métricas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <DashboardLayout breadcrumbLabel="Métricas de Tickets">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel="Métricas de Tickets">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <DateRangeFilter
            preset={preset}
            onPresetChange={setPreset}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
          
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(metrics?.avgResponseTime || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.totalTickets || 0} tickets no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Resolução</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(metrics?.avgResolutionTime || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.totalTickets || 0} tickets analisados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Cumprimento SLA</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.slaComplianceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.slaBreached || 0} de {metrics?.ticketsWithSLA || 0} estouraram
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.avgRating.toFixed(1)} ⭐</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.ticketsWithRating || 0} avaliações recebidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Metrics Line Chart */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Tendência de Tempo de Resposta e Resolução</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics?.dailyMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    formatter={(value: any) => formatMinutes(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Tempo de Resposta"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolutionTime"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    name="Tempo de Resolução"
                    dot={{ fill: 'hsl(var(--secondary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* SLA Compliance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Cumprimento SLA por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics?.dailyMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    className="text-xs"
                  />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="slaCompliance"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    name="SLA Cumprido (%)"
                    dot={{ fill: 'hsl(142 76% 36%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics?.priorityDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {metrics?.priorityDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Distribuição de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.ratingDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="rating" className="text-xs" label={{ value: 'Estrelas', position: 'insideBottom', offset: -5 }} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Quantidade de Avaliações" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
