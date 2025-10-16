import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Globe, AlertCircle, CheckCircle } from "lucide-react";
import { format, addMonths, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MaintenancePlansList() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["maintenance-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_maintenance_plans")
        .select(`
          *,
          client:clients(id, full_name, nickname, company_name),
          domain:domains(id, domain),
          last_execution:maintenance_executions(executed_at)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getNextMaintenanceDate = (plan: any) => {
    if (!plan.last_execution || plan.last_execution.length === 0) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), plan.monthly_day);
    }
    
    const lastDate = parseISO(plan.last_execution[0].executed_at);
    return addMonths(new Date(lastDate.getFullYear(), lastDate.getMonth(), plan.monthly_day), 1);
  };

  const getStatus = (nextDate: Date) => {
    const today = new Date();
    const diff = differenceInDays(nextDate, today);
    
    if (diff < 0) return { label: "Atrasado", variant: "destructive" as const, icon: AlertCircle };
    if (diff <= 7) return { label: "Próximo", variant: "secondary" as const, icon: AlertCircle };
    return { label: "Em dia", variant: "default" as const, icon: CheckCircle };
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans?.map((plan) => {
        const nextDate = getNextMaintenanceDate(plan);
        const status = getStatus(nextDate);
        const StatusIcon = status.icon;
        const clientName = plan.client?.nickname || plan.client?.company_name || plan.client?.full_name;

        return (
          <Card key={plan.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{clientName}</CardTitle>
                <Badge variant={status.variant}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              {plan.domain && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="mr-1 h-3 w-3" />
                  {plan.domain.domain}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                {plan.last_execution && plan.last_execution.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Última:</span>
                    <span className="font-medium">
                      {format(parseISO(plan.last_execution[0].executed_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Próxima:</span>
                  <span className="font-medium flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {format(nextDate, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {plans?.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum plano de manutenção ativo</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
