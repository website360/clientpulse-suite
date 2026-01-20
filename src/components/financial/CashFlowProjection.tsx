import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CashFlowProjection() {
  const [period, setPeriod] = useState<"30" | "60" | "90">("30");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const endDate = addDays(new Date(), parseInt(period));

  // Fetch projected receivables
  const { data: receivables } = useQuery({
    queryKey: ["projected-receivables", period, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("accounts_receivable")
        .select("*, clients(full_name, company_name)")
        .gte("due_date", format(startOfDay(new Date()), "yyyy-MM-dd"))
        .lte("due_date", format(endOfDay(endDate), "yyyy-MM-dd"))
        .neq("status", "paid");

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projected payables
  const { data: payables } = useQuery({
    queryKey: ["projected-payables", period, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("accounts_payable")
        .select("*, suppliers(name)")
        .gte("due_date", format(startOfDay(new Date()), "yyyy-MM-dd"))
        .lte("due_date", format(endOfDay(endDate), "yyyy-MM-dd"))
        .neq("status", "paid");

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique categories from existing data
  const categories = [
    { id: "all", name: "Todas as categorias" },
    ...(receivables?.map(r => r.category).filter((v, i, a) => a.indexOf(v) === i).map(cat => ({ id: cat, name: cat })) || []),
    ...(payables?.map(p => p.category).filter((v, i, a) => a.indexOf(v) === i).map(cat => ({ id: cat, name: cat })) || [])
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate projections
  const totalReceivables = receivables?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const totalPayables = payables?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const projectedBalance = totalReceivables - totalPayables;

  // Group by week for chart
  const chartData = [];
  for (let i = 0; i < parseInt(period); i += 7) {
    const weekStart = addDays(new Date(), i);
    const weekEnd = addDays(weekStart, 6);
    
    const weekReceivables = receivables?.filter(r => {
      const dueDate = new Date(r.due_date);
      return dueDate >= weekStart && dueDate <= weekEnd;
    }).reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

    const weekPayables = payables?.filter(p => {
      const dueDate = new Date(p.due_date);
      return dueDate >= weekStart && dueDate <= weekEnd;
    }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    chartData.push({
      name: format(weekStart, "dd/MMM", { locale: ptBR }),
      receitas: weekReceivables,
      despesas: weekPayables,
      saldo: weekReceivables - weekPayables,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Fluxo de Caixa Projetado</h2>
          <p className="text-sm text-muted-foreground">
            Projeção de receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[120px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receitas Previstas</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">{formatCurrency(totalReceivables)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {receivables?.length || 0} títulos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas Agendadas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{formatCurrency(totalPayables)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payables?.length || 0} títulos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Projetado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${projectedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(projectedBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {projectedBalance >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gráfico de Projeção</CardTitle>
          <CardDescription>
            Receitas vs Despesas por semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={chartData} />
        </CardContent>
      </Card>

      {/* Detailed Lists */}
      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">
            Receitas ({receivables?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="payables">
            Despesas ({payables?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {receivables?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.clients?.company_name || item.clients?.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        {item.category && (
                          <Badge variant="outline">{item.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(item.amount)}</p>
                      <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                        {item.status === 'overdue' ? 'Vencido' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!receivables || receivables.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma receita prevista para este período
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {payables?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{item.suppliers?.name || item.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        {item.category && (
                          <Badge variant="outline">{item.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(item.amount)}</p>
                      <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                        {item.status === 'overdue' ? 'Vencido' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!payables || payables.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa agendada para este período
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
