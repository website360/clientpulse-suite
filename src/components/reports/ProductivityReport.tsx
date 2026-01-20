import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileSpreadsheet, FileText, Loader2, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProductivityFilters {
  startDate: Date;
  endDate: Date;
  departmentId: string;
  technicianId: string;
}

export default function ProductivityReport() {
  const [filters, setFilters] = useState<ProductivityFilters>({
    startDate: startOfMonth(subMonths(new Date(), 0)),
    endDate: endOfMonth(new Date()),
    departmentId: 'all',
    technicianId: 'all',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles(id, full_name)')
        .eq('role', 'admin');
      if (error) throw error;
      return data.map(t => Array.isArray(t.profiles) ? t.profiles[0] : t.profiles).filter(Boolean);
    },
  });

  const { data: productivityData, isLoading } = useQuery({
    queryKey: ['productivity-report', filters],
    queryFn: async () => {
      let ticketsQuery = supabase
        .from('tickets')
        .select(`
          *,
          profiles!tickets_assigned_to_fkey(full_name),
          departments(name),
          ticket_sla_tracking(
            first_response_breached,
            resolution_breached
          )
        `)
        .gte('created_at', format(filters.startDate, 'yyyy-MM-dd'))
        .lte('created_at', format(filters.endDate, 'yyyy-MM-dd'));

      if (filters.departmentId !== 'all') {
        ticketsQuery = ticketsQuery.eq('department_id', filters.departmentId);
      }

      if (filters.technicianId !== 'all') {
        ticketsQuery = ticketsQuery.eq('assigned_to', filters.technicianId);
      }

      const { data: tickets, error } = await ticketsQuery;
      if (error) throw error;

      // Agrupar por técnico
      const technicianStats: Record<string, any> = {};

      tickets?.forEach((ticket) => {
        const techId = ticket.assigned_to || 'unassigned';
        const profiles: any = ticket.profiles;
        const techName = (Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name) || 'Não Atribuído';

        if (!technicianStats[techId]) {
          technicianStats[techId] = {
            id: techId,
            name: techName,
            totalTickets: 0,
            resolvedTickets: 0,
            avgResolutionTime: 0,
            slaCompliance: 0,
            slaBreach: 0,
            resolutionTimes: [],
          };
        }

        technicianStats[techId].totalTickets++;

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          technicianStats[techId].resolvedTickets++;
          if (ticket.resolution_time_minutes) {
            technicianStats[techId].resolutionTimes.push(ticket.resolution_time_minutes);
          }
        }

        // SLA tracking
        if (ticket.ticket_sla_tracking?.[0]) {
          const sla = ticket.ticket_sla_tracking[0];
          if (sla.first_response_breached || sla.resolution_breached) {
            technicianStats[techId].slaBreach++;
          } else {
            technicianStats[techId].slaCompliance++;
          }
        }
      });

      // Calcular médias
      Object.values(technicianStats).forEach((stat: any) => {
        if (stat.resolutionTimes.length > 0) {
          stat.avgResolutionTime = Math.round(
            stat.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / stat.resolutionTimes.length
          );
        }
        stat.slaComplianceRate = stat.totalTickets > 0 
          ? Math.round((stat.slaCompliance / (stat.slaCompliance + stat.slaBreach)) * 100)
          : 0;
      });

      return Object.values(technicianStats);
    },
  });

  const formatMinutes = (minutes: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const exportToExcel = () => {
    if (!productivityData || productivityData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const exportData = productivityData.map((tech: any) => ({
      Técnico: tech.name,
      'Total de Tickets': tech.totalTickets,
      'Tickets Resolvidos': tech.resolvedTickets,
      'Tempo Médio de Resolução': formatMinutes(tech.avgResolutionTime),
      'SLA Cumprido': tech.slaCompliance,
      'SLA Quebrado': tech.slaBreach,
      'Taxa de Cumprimento SLA': `${tech.slaComplianceRate}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtividade');
    XLSX.writeFile(wb, `relatorio-produtividade-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!productivityData || productivityData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Produtividade', 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 27);

    const tableData = productivityData.map((tech: any) => [
      tech.name,
      tech.totalTickets,
      tech.resolvedTickets,
      formatMinutes(tech.avgResolutionTime),
      `${tech.slaComplianceRate}%`,
    ]);

    autoTable(doc, {
      head: [['Técnico', 'Total', 'Resolvidos', 'Tempo Médio', 'SLA %']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`relatorio-produtividade-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

  const chartData = productivityData?.map((tech: any) => ({
    name: tech.name.split(' ')[0], // Primeiro nome
    'Total': tech.totalTickets,
    'Resolvidos': tech.resolvedTickets,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure o período e filtros do relatório</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => date && setFilters({ ...filters, startDate: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => date && setFilters({ ...filters, endDate: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filters.departmentId} onValueChange={(value) => setFilters({ ...filters, departmentId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select value={filters.technicianId} onValueChange={(value) => setFilters({ ...filters, technicianId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians?.map((tech: any) => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {productivityData?.reduce((sum: number, tech: any) => sum + tech.totalTickets, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Resolvidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {productivityData?.reduce((sum: number, tech: any) => sum + tech.resolvedTickets, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatMinutes(
                productivityData?.reduce((sum: number, tech: any) => sum + tech.avgResolutionTime, 0) /
                  (productivityData?.length || 1) || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Cumprido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {Math.round(
                (productivityData?.reduce((sum: number, tech: any) => sum + tech.slaCompliance, 0) /
                  (productivityData?.reduce((sum: number, tech: any) => sum + (tech.slaCompliance + tech.slaBreach), 0) || 1)) *
                  100
              )}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade por Técnico</CardTitle>
          <CardDescription>Comparação de tickets totais vs resolvidos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Total" fill="hsl(var(--primary))" />
              <Bar dataKey="Resolvidos" fill="hsl(142, 76%, 36%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhamento por Técnico</CardTitle>
              <CardDescription>{productivityData?.length || 0} técnico(s) encontrado(s)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Card className="card-elevated">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Resolvidos</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                  <TableHead className="text-center">SLA Cumprido</TableHead>
                  <TableHead className="text-center">SLA Quebrado</TableHead>
                  <TableHead className="text-center">Taxa SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productivityData && productivityData.length > 0 ? (
                  productivityData.map((tech: any) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell className="text-center">{tech.totalTickets}</TableCell>
                      <TableCell className="text-center">{tech.resolvedTickets}</TableCell>
                      <TableCell className="text-center">{formatMinutes(tech.avgResolutionTime)}</TableCell>
                      <TableCell className="text-center text-green-600">{tech.slaCompliance}</TableCell>
                      <TableCell className="text-center text-red-600">{tech.slaBreach}</TableCell>
                      <TableCell className="text-center font-semibold">{tech.slaComplianceRate}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Nenhum dado encontrado para o período selecionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
