import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
  const totalClients = topClients?.length || 0;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Ranking de Performance</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-2.5 bg-muted rounded-full" />
              <div className="h-2.5 bg-muted rounded-full w-3/4" />
              <div className="h-2.5 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topClients || topClients.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Ranking de Performance</CardTitle>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Ranking de Performance</CardTitle>
              <p className="text-2xl font-bold">{totalClients}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topClients.map((client, index) => (
            <div key={client.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  <span className="font-medium text-muted-foreground">{client.name}</span>
                </div>
                <span className="font-semibold">{formatCurrency(client.revenue)}</span>
              </div>
              <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out bg-secondary"
                  style={{
                    width: `${(client.revenue / maxRevenue) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
