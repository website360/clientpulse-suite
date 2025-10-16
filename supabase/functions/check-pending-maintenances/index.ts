import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Verificando manutenções pendentes...");

    // Buscar todos os planos ativos
    const { data: plans, error: plansError } = await supabase
      .from("client_maintenance_plans")
      .select(`
        *,
        client:clients(id, full_name, nickname, company_name),
        domain:domains(domain),
        last_execution:maintenance_executions(executed_at)
      `)
      .eq("is_active", true);

    if (plansError) throw plansError;

    const today = new Date();
    const notificationDaysAdvance = 7; // Dias de antecedência

    for (const plan of plans || []) {
      // Calcular próxima data de manutenção
      let nextDate: Date;
      if (!plan.last_execution || plan.last_execution.length === 0) {
        nextDate = new Date(today.getFullYear(), today.getMonth(), plan.monthly_day);
      } else {
        const lastDate = new Date(plan.last_execution[0].executed_at);
        const nextMonth = new Date(lastDate);
        nextMonth.setMonth(lastDate.getMonth() + 1);
        nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), plan.monthly_day);
      }

      const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Se está atrasado ou próximo (até 7 dias)
      if (diffDays <= notificationDaysAdvance) {
        const clientName = plan.client?.nickname || plan.client?.company_name || plan.client?.full_name;
        const domain = plan.domain?.domain || "site";

        // Verificar se já existe notificação para hoje
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("reference_type", "maintenance")
          .eq("reference_id", plan.id)
          .gte("created_at", new Date(today.setHours(0, 0, 0, 0)).toISOString())
          .single();

        if (!existingNotif) {
          // Buscar todos os admins
          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminRoles) {
            for (const adminRole of adminRoles) {
              await supabase.from("notifications").insert({
                user_id: adminRole.user_id,
                title: diffDays < 0 ? "Manutenção atrasada" : "Manutenção próxima",
                description: `Manutenção de ${clientName} (${domain}) ${
                  diffDays < 0 ? `está atrasada há ${Math.abs(diffDays)} dias` : `vence em ${diffDays} dias`
                }`,
                type: diffDays < 0 ? "error" : "warning",
                reference_type: "maintenance",
                reference_id: plan.id,
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verificação concluída" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
