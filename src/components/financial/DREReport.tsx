import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function DREReport() {
  const [monthsBack, setMonthsBack] = useState<string>("0");
  
  const selectedMonth = subMonths(new Date(), parseInt(monthsBack));
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  // Fetch revenues (receivables paid)
  const { data: revenues } = useQuery({
    queryKey: ["dre-revenues", monthsBack],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select("*")
        .eq("status", "paid")
        .gte("payment_date", format(startDate, "yyyy-MM-dd"))
        .lte("payment_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expenses (payables paid)
  const { data: expenses } = useQuery({
    queryKey: ["dre-expenses", monthsBack],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("*")
        .eq("status", "paid")
        .gte("payment_date", format(startDate, "yyyy-MM-dd"))
        .lte("payment_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate DRE metrics
  const totalRevenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  const grossProfit = totalRevenue;
  const operatingExpenses = totalExpenses;
  const netProfit = grossProfit - operatingExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Group expenses by category
  const expensesByCategory = expenses?.reduce((acc, expense) => {
    const category = expense.category || "Sem categoria";
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += expense.amount || 0;
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Demonstrativo de Resultado (DRE)", 14, 20);
    doc.setFontSize(12);
    doc.text(format(selectedMonth, "MMMM/yyyy", { locale: ptBR }), 14, 28);

    const tableData = [
      ["Receita Bruta", formatCurrency(totalRevenue)],
      ["(-) Deduções", formatCurrency(0)],
      ["= Receita Líquida", formatCurrency(totalRevenue)],
      ["", ""],
      ["(-) Despesas Operacionais", formatCurrency(operatingExpenses)],
      ...Object.entries(expensesByCategory || {}).map(([cat, val]) => [
        `    ${cat}`,
        formatCurrency(val),
      ]),
      ["", ""],
      ["= Resultado Operacional", formatCurrency(netProfit)],
      ["", ""],
      ["Margem Líquida", `${profitMargin.toFixed(2)}%`],
    ];

    autoTable(doc, {
      startY: 35,
      head: [["Item", "Valor"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`DRE_${format(selectedMonth, "yyyy-MM")}.pdf`);
  };

  const exportToExcel = () => {
    const data = [
      ["Demonstrativo de Resultado (DRE)"],
      [format(selectedMonth, "MMMM/yyyy", { locale: ptBR })],
      [""],
      ["Item", "Valor"],
      ["Receita Bruta", totalRevenue],
      ["(-) Deduções", 0],
      ["= Receita Líquida", totalRevenue],
      [""],
      ["(-) Despesas Operacionais", operatingExpenses],
      ...Object.entries(expensesByCategory || {}).map(([cat, val]) => [
        `    ${cat}`,
        val,
      ]),
      [""],
      ["= Resultado Operacional", netProfit],
      [""],
      ["Margem Líquida", `${profitMargin.toFixed(2)}%`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRE");
    XLSX.writeFile(wb, `DRE_${format(selectedMonth, "yyyy-MM")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h2>
          <p className="text-muted-foreground">
            Análise de receitas, despesas e lucratividade
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={monthsBack} onValueChange={setMonthsBack}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Mês atual</SelectItem>
              <SelectItem value="1">Mês passado</SelectItem>
              <SelectItem value="2">2 meses atrás</SelectItem>
              <SelectItem value="3">3 meses atrás</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profitMargin.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo Detalhado</CardTitle>
          <CardDescription>
            {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-medium">
                <TableCell>Receita Bruta</TableCell>
                <TableCell className="text-right text-success">{formatCurrency(totalRevenue)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8">(-) Deduções</TableCell>
                <TableCell className="text-right">{formatCurrency(0)}</TableCell>
              </TableRow>
              <TableRow className="font-bold border-t-2">
                <TableCell>= Receita Líquida</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
              </TableRow>
              <TableRow className="h-4" />
              <TableRow className="font-medium">
                <TableCell>(-) Despesas Operacionais</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(operatingExpenses)}</TableCell>
              </TableRow>
              {Object.entries(expensesByCategory || {}).map(([category, amount]) => (
                <TableRow key={category}>
                  <TableCell className="pl-8 text-muted-foreground">{category}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="h-4" />
              <TableRow className="font-bold border-t-2">
                <TableCell>= Resultado Operacional</TableCell>
                <TableCell className={`text-right ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netProfit)}
                </TableCell>
              </TableRow>
              <TableRow className="h-4" />
              <TableRow className="font-bold">
                <TableCell>Margem Líquida</TableCell>
                <TableCell className={`text-right ${profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {profitMargin.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
