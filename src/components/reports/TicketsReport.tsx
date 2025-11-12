import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TicketsReportFilters {
  startDate: Date;
  endDate: Date;
  departmentId: string;
  priority: string;
  status: string;
}

export default function TicketsReport() {
  const [filters, setFilters] = useState<TicketsReportFilters>({
    startDate: startOfMonth(subMonths(new Date(), 0)),
    endDate: endOfMonth(new Date()),
    departmentId: 'all',
    priority: 'all',
    status: 'all',
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

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets-report', filters],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          departments(name, color),
          clients(full_name, responsible_name, company_name, client_type),
          ticket_sla_tracking(first_response_breached, resolution_breached)
        `)
        .gte('created_at', format(filters.startDate, 'yyyy-MM-dd'))
        .lte('created_at', format(filters.endDate, 'yyyy-MM-dd'));

      if (filters.departmentId !== 'all') {
        query = query.eq('department_id', filters.departmentId);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority as any);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: 'Aguardando',
      in_progress: 'Em Atendimento',
      resolved: 'Resolvido',
      closed: 'Concluído',
    };
    return labels[status] || status;
  };

  const getPriorityVariant = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      urgent: 'destructive',
    };
    return variants[priority] || 'outline';
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      waiting: 'secondary',
      in_progress: 'outline',
      resolved: 'default',
      closed: 'default',
    };
    return variants[status] || 'outline';
  };

  // Dados para gráficos
  const priorityChartData = [
    { name: 'Baixa', value: ticketsData?.filter(t => t.priority === 'low').length || 0, color: '#9CA3AF' },
    { name: 'Média', value: ticketsData?.filter(t => t.priority === 'medium').length || 0, color: '#3B82F6' },
    { name: 'Alta', value: ticketsData?.filter(t => t.priority === 'high').length || 0, color: '#F59E0B' },
    { name: 'Urgente', value: ticketsData?.filter(t => t.priority === 'urgent').length || 0, color: '#EF4444' },
  ];

  const departmentChartData = departments?.map(dept => ({
    name: dept.name,
    value: ticketsData?.filter(t => t.department_id === dept.id).length || 0,
  })).filter(d => d.value > 0) || [];

  const exportToExcel = () => {
    if (!ticketsData || ticketsData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const exportData = ticketsData.map((ticket: any) => ({
      'Nº Ticket': ticket.ticket_number,
      Cliente: ticket.clients?.responsible_name || ticket.clients?.company_name || ticket.clients?.full_name,
      Assunto: ticket.subject,
      Departamento: ticket.departments?.name,
      Prioridade: getPriorityLabel(ticket.priority),
      Status: getStatusLabel(ticket.status),
      'Data Criação': format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'SLA': ticket.ticket_sla_tracking?.[0]?.resolution_breached ? 'Quebrado' : 'Cumprido',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `relatorio-tickets-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!ticketsData || ticketsData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Tickets', 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 27);

    const tableData = ticketsData.map((ticket: any) => [
      ticket.ticket_number,
      ticket.departments?.name,
      getPriorityLabel(ticket.priority),
      getStatusLabel(ticket.status),
      format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    ]);

    autoTable(doc, {
      head: [['Nº', 'Departamento', 'Prioridade', 'Status', 'Data']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`relatorio-tickets-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <SelectItem value="all">Todos</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Tickets</CardTitle>
              <CardDescription>{ticketsData?.length || 0} ticket(s) encontrado(s)</CardDescription>
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsData && ticketsData.length > 0 ? (
                  ticketsData.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.ticket_number}</TableCell>
                      <TableCell>
                        {ticket.clients?.responsible_name || ticket.clients?.company_name || ticket.clients?.full_name}
                      </TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.departments?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Nenhum ticket encontrado para o período selecionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
