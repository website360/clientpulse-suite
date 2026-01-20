import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ClientRankingWidget() {
  const { data: topClients, isLoading } = useQuery({
    queryKey: ["top-clients-revenue"],
    queryFn: async () => {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, full_name, company_name, responsible_name")
        .eq("is_active", true);

      if (clientsError) throw clientsError;

      const clientRevenues = await Promise.all(
        (clients || []).map(async (client) => {
          const { data: revenues } = await supabase
            .from("accounts_receivable")
            .select("amount")
            .eq("client_id", client.id)
            .eq("status", "paid");

          const totalRevenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

          return {
            id: client.id,
            name: client.company_name || client.full_name || client.responsible_name || "Cliente",
            revenue: totalRevenue,
          };
        })
      );

      return clientRevenues
        .filter(c => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const maxRevenue = topClients?.[0]?.revenue || 1;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!topClients || topClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ranking de Performance</CardTitle>
        <p className="text-sm text-muted-foreground">Clientes mais lucrativos</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {topClients.map((client, index) => (
          <div key={client.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-4">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{client.name}</span>
              </div>
              <span className="text-sm font-semibold text-success">
                {formatCurrency(client.revenue)}
              </span>
            </div>
            <Progress value={(client.revenue / maxRevenue) * 100} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
