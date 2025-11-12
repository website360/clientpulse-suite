import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, AlertCircle, TrendingDown, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DefaultReportFilters {
  agingRange: string;
  clientId: string;
}

export default function DefaultReport() {
  const [filters, setFilters] = useState<DefaultReportFilters>({
    agingRange: 'all',
    clientId: 'all',
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, responsible_name, company_name, client_type')
        .eq('is_active', true)
        .order('responsible_name', { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: overdueReceivables, isLoading } = useQuery({
    queryKey: ['overdue-receivables', filters],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      let query = supabase
        .from('accounts_receivable')
        .select(`
          *,
          client:clients(id, full_name, responsible_name, company_name, client_type, phone, email)
        `)
        .eq('status', 'overdue')
        .lt('due_date', today);

      if (filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }

      const { data, error } = await query.order('due_date', { ascending: true });
      if (error) throw error;

      // Calcular aging
      return data?.map(item => {
        const daysOverdue = differenceInDays(new Date(), new Date(item.due_date));
        let agingCategory = '0-30';
        if (daysOverdue > 90) agingCategory = '90+';
        else if (daysOverdue > 60) agingCategory = '60-90';
        else if (daysOverdue > 30) agingCategory = '30-60';

        return {
          ...item,
          daysOverdue,
          agingCategory,
        };
      }).filter(item => {
        if (filters.agingRange === 'all') return true;
        return item.agingCategory === filters.agingRange;
      }) || [];
    },
  });

  // Estatísticas
  const totalOverdue = overdueReceivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const totalClients = new Set(overdueReceivables?.map(item => item.client_id)).size;

  // Aging breakdown
  const agingData = [
    {
      range: '0-30 dias',
      count: overdueReceivables?.filter(i => i.agingCategory === '0-30').length || 0,
      value: overdueReceivables?.filter(i => i.agingCategory === '0-30').reduce((s, i) => s + Number(i.amount), 0) || 0,
    },
    {
      range: '30-60 dias',
      count: overdueReceivables?.filter(i => i.agingCategory === '30-60').length || 0,
      value: overdueReceivables?.filter(i => i.agingCategory === '30-60').reduce((s, i) => s + Number(i.amount), 0) || 0,
    },
    {
      range: '60-90 dias',
      count: overdueReceivables?.filter(i => i.agingCategory === '60-90').length || 0,
      value: overdueReceivables?.filter(i => i.agingCategory === '60-90').reduce((s, i) => s + Number(i.amount), 0) || 0,
    },
    {
      range: '90+ dias',
      count: overdueReceivables?.filter(i => i.agingCategory === '90+').length || 0,
      value: overdueReceivables?.filter(i => i.agingCategory === '90+').reduce((s, i) => s + Number(i.amount), 0) || 0,
    },
  ];

  const exportToExcel = () => {
    if (!overdueReceivables || overdueReceivables.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const exportData = overdueReceivables.map((item: any) => ({
      Cliente: item.client?.responsible_name || item.client?.company_name || item.client?.full_name,
      Telefone: item.client?.phone || '-',
      Email: item.client?.email || '-',
      Descrição: item.description,
      Valor: `R$ ${Number(item.amount).toFixed(2).replace('.', ',')}`,
      Vencimento: format(new Date(item.due_date), 'dd/MM/yyyy', { locale: ptBR }),
      'Dias em Atraso': item.daysOverdue,
      Categoria: item.agingCategory + ' dias',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inadimplência');
    XLSX.writeFile(wb, `relatorio-inadimplencia-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!overdueReceivables || overdueReceivables.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Inadimplência', 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 22);
    doc.text(`Total em Atraso: R$ ${totalOverdue.toFixed(2).replace('.', ',')}`, 14, 27);

    const tableData = overdueReceivables.map((item: any) => [
      item.client?.responsible_name || item.client?.company_name || item.client?.full_name,
      item.description,
      `R$ ${Number(item.amount).toFixed(2).replace('.', ',')}`,
      format(new Date(item.due_date), 'dd/MM/yyyy', { locale: ptBR }),
      item.daysOverdue + ' dias',
    ]);

    autoTable(doc, {
      head: [['Cliente', 'Descrição', 'Valor', 'Vencimento', 'Atraso']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save(`relatorio-inadimplencia-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
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
          <CardDescription>Filtre contas vencidas por período de atraso e cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período de Atraso</Label>
              <Select value={filters.agingRange} onValueChange={(value) => setFilters({ ...filters, agingRange: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="0-30">0-30 dias</SelectItem>
                  <SelectItem value="30-60">30-60 dias</SelectItem>
                  <SelectItem value="60-90">60-90 dias</SelectItem>
                  <SelectItem value="90+">90+ dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Atraso</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalOverdue.toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas em Atraso</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overdueReceivables?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Inadimplentes</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalClients}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Aging */}
      <Card>
        <CardHeader>
          <CardTitle>Aging de Inadimplência</CardTitle>
          <CardDescription>Distribuição de valores por período de atraso</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`}
              />
              <Legend />
              <Bar dataKey="value" name="Valor (R$)" fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contas Vencidas</CardTitle>
              <CardDescription>{overdueReceivables?.length || 0} conta(s) encontrada(s)</CardDescription>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-center">Dias em Atraso</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueReceivables && overdueReceivables.length > 0 ? (
                  overdueReceivables.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <ClientNameCell client={item.client || {}} />
                      </TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        R$ {Number(item.amount).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>{format(new Date(item.due_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{item.daysOverdue} dias</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.agingCategory} dias</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{item.client?.phone || '-'}</div>
                        <div className="text-muted-foreground text-xs">{item.client?.email || '-'}</div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      🎉 Nenhuma conta em atraso encontrada!
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
