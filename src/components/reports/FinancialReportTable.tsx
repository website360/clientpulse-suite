import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialReportFilters } from '@/pages/Reports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialReportTableProps {
  filters: FinancialReportFilters;
}

export default function FinancialReportTable({ filters }: FinancialReportTableProps) {
  const { data: records, isLoading } = useQuery({
    queryKey: ['financial-report', filters],
    queryFn: async () => {
      const table = filters.reportType === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      
      // Build query dynamically
      let query: any = supabase.from(table).select(`
        *,
        ${filters.reportType === 'payable' ? 'supplier:suppliers(name)' : 'client:clients(full_name, nickname, company_name)'}
      `);

      // Aplicar filtros de status
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Aplicar filtros de categoria
      if (filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      // Aplicar filtros de data
      if (filters.startDate) {
        const startDateStr = format(filters.startDate, 'yyyy-MM-dd');
        query = query.gte('due_date', startDateStr);
      }
      if (filters.endDate) {
        const endDateStr = format(filters.endDate, 'yyyy-MM-dd');
        query = query.lte('due_date', endDateStr);
      }

      // Aplicar filtros de forma de pagamento
      if (filters.paymentMethods.length > 0) {
        query = query.in('payment_method', filters.paymentMethods);
      }

      // Aplicar filtro de cliente
      if (filters.reportType === 'receivable' && filters.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      
      // Aplicar filtro de fornecedor
      if (filters.reportType === 'payable' && filters.supplierId && filters.supplierId !== 'all') {
        query = query.eq('supplier_id', filters.supplierId);
      }

      query = query.order('due_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Vencido',
      canceled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      canceled: 'outline',
    };
    return variants[status] || 'outline';
  };

  const exportToExcel = () => {
    if (!records || records.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const exportData = records.map((record: any) => ({
      Descrição: record.description,
      Categoria: record.category,
      [filters.reportType === 'payable' ? 'Fornecedor' : 'Cliente']:
        filters.reportType === 'payable'
          ? record.supplier?.name
          : record.client?.nickname || record.client?.company_name || record.client?.full_name,
      Valor: `R$ ${Number(record.amount).toFixed(2).replace('.', ',')}`,
      'Data de Vencimento': format(new Date(record.due_date), 'dd/MM/yyyy', { locale: ptBR }),
      Status: getStatusLabel(record.status),
      'Forma de Pagamento': record.payment_method || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio-financeiro-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!records || records.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Relatório Financeiro', 14, 15);
    
    // Subtítulo
    doc.setFontSize(10);
    doc.text(`Tipo: ${filters.reportType === 'payable' ? 'Contas a Pagar' : 'Contas a Receber'}`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 27);

    // Tabela
    const tableData = records.map((record: any) => [
      record.description,
      record.category,
      filters.reportType === 'payable'
        ? record.supplier?.name
        : record.client?.nickname || record.client?.company_name || record.client?.full_name,
      `R$ ${Number(record.amount).toFixed(2).replace('.', ',')}`,
      format(new Date(record.due_date), 'dd/MM/yyyy', { locale: ptBR }),
      getStatusLabel(record.status),
    ]);

    autoTable(doc, {
      head: [['Descrição', 'Categoria', filters.reportType === 'payable' ? 'Fornecedor' : 'Cliente', 'Valor', 'Vencimento', 'Status']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    // Total
    const total = records.reduce((sum: number, record: any) => sum + Number(record.amount), 0);
    const finalY = (doc as any).lastAutoTable.finalY || 32;
    doc.setFontSize(12);
    doc.text(`Total: R$ ${total.toFixed(2).replace('.', ',')}`, 14, finalY + 10);

    doc.save(`relatorio-financeiro-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

  const total = records?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {records?.length || 0} registro(s) encontrado(s)
          </p>
          <p className="text-2xl font-bold">
            Total: R$ {total.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>{filters.reportType === 'payable' ? 'Fornecedor' : 'Cliente'}</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Forma de Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records && records.length > 0 ? (
              records.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.description}</TableCell>
                  <TableCell>{record.category}</TableCell>
                  <TableCell>
                    {filters.reportType === 'payable'
                      ? record.supplier?.name
                      : record.client?.nickname || record.client?.company_name || record.client?.full_name}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {Number(record.amount).toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell>{format(new Date(record.due_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(record.status)}>{getStatusLabel(record.status)}</Badge>
                  </TableCell>
                  <TableCell>{record.payment_method || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Nenhum registro encontrado com os filtros selecionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
