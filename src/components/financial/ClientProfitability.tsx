import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { PriorityPieChart } from "@/components/charts/PriorityPieChart";

export function ClientProfitability() {
  // Fetch clients with their financial data
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["client-profitability"],
    queryFn: async () => {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, full_name, company_name");

      if (clientsError) throw clientsError;

      // Fetch revenues and costs for each client
      const clientAnalysis = await Promise.all(
        (clients || []).map(async (client) => {
          // Get revenues (receivables paid)
          const { data: revenues } = await supabase
            .from("accounts_receivable")
            .select("amount")
            .eq("client_id", client.id)
            .eq("status", "paid");

          // Get costs (payables related to client)
          const { data: payables } = await supabase
            .from("accounts_payable")
            .select("amount, description")
            .ilike("description", `%${client.company_name || client.full_name}%`)
            .eq("status", "paid");

          const totalRevenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
          const totalCosts = payables?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          
          const profit = totalRevenue - totalCosts;
          const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
          const roi = totalCosts > 0 ? ((profit / totalCosts) * 100) : 0;

          return {
            ...client,
            totalRevenue,
            totalCosts,
            profit,
            profitMargin,
            roi,
          };
        })
      );

      // Sort by profit (highest first)
      return clientAnalysis.sort((a, b) => b.profit - a.profit);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate totals
  const totalRevenue = clientsData?.reduce((sum, c) => sum + c.totalRevenue, 0) || 0;
  const totalCosts = clientsData?.reduce((sum, c) => sum + c.totalCosts, 0) || 0;
  const totalProfit = totalRevenue - totalCosts;
  const avgMargin = clientsData?.length 
    ? clientsData.reduce((sum, c) => sum + c.profitMargin, 0) / clientsData.length 
    : 0;

  // Prepare chart data (top 5 clients by revenue)
  const chartData = clientsData?.slice(0, 5).map((client, index) => ({
    name: client.company_name || client.full_name,
    value: client.totalRevenue,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  })) || [];

  if (isLoading) {
    return <div>Carregando análise de lucratividade...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Análise de Lucratividade por Cliente</h2>
        <p className="text-sm text-muted-foreground">
          Receitas, custos e margem de lucro de cada cliente
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custos Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{formatCurrency(totalCosts)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{avgMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Clientes por Receita</CardTitle>
            <CardDescription>Distribuição de receitas</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityPieChart data={chartData} />
          </CardContent>
        </Card>

        {/* Performance ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Performance</CardTitle>
            <CardDescription>Clientes mais lucrativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientsData?.slice(0, 5).map((client, index) => (
                <div key={client.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">
                        {client.company_name || client.full_name}
                      </span>
                    </div>
                    <span className="font-bold text-success">
                      {formatCurrency(client.profit)}
                    </span>
                  </div>
                  <Progress value={Math.min((client.profit / totalProfit) * 100, 100)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise Detalhada por Cliente</CardTitle>
          <CardDescription>
            Receitas, custos, lucro e indicadores de rentabilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsData?.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.company_name || client.full_name}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(client.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(client.totalCosts)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${client.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(client.profit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={client.profitMargin >= 20 ? 'default' : client.profitMargin >= 10 ? 'secondary' : 'destructive'}>
                      {client.profitMargin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={client.roi >= 50 ? 'default' : client.roi >= 20 ? 'secondary' : 'outline'}>
                      {client.roi.toFixed(0)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
