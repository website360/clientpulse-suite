import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { maintenance_execution_id } = await req.json();

    if (!maintenance_execution_id) {
      throw new Error("maintenance_execution_id é obrigatório");
    }

    // Buscar dados da execução COM TODOS OS CAMPOS NECESSÁRIOS
    const { data: execution, error: execError } = await supabase
      .from("maintenance_executions")
      .select(`
        *,
        plan:client_maintenance_plans(
          client:clients(id, full_name, nickname, company_name, phone, email),
          domain:domains(domain)
        )
      `)
      .eq("id", maintenance_execution_id)
      .single();

    if (execError) throw execError;

    // Buscar itens da execução COM A ORDEM CORRETA
    const { data: items, error: itemsError } = await supabase
      .from("maintenance_execution_items")
      .select(`
        *,
        item:maintenance_checklist_items(name, order)
      `)
      .eq("maintenance_execution_id", maintenance_execution_id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    // Ordenar items pela ordem do checklist
    const sortedItems = items?.sort((a: any, b: any) => {
      return (a.item?.order || 0) - (b.item?.order || 0);
    });

    // Montar checklist formatado NA ORDEM CORRETA
    let checklistText = "";
    sortedItems?.forEach((item: any) => {
      let icon = "";
      let statusText = "";
      
      if (item.status === "done") {
        icon = "✅";
        statusText = "Realizado";
      } else if (item.status === "not_needed") {
        icon = "☑️";
        statusText = "Não houve necessidade";
      } else if (item.status === "skipped") {
        icon = "⏭️";
        statusText = "Pulado";
      } else {
        icon = "•";
        statusText = "";
      }
      
      checklistText += `${icon} ${item.item.name}${statusText ? ": " + statusText : ""}\n`;
    });

    // Preparar dados para o sistema de notificações (MESMA ESTRUTURA DA RPC)
    const clientData = {
      client_name: execution.plan?.client?.nickname || 
                   execution.plan?.client?.company_name || 
                   execution.plan?.client?.full_name,
      client_email: execution.plan?.client?.email,
      client_phone: execution.plan?.client?.phone,
      site_url: execution.plan?.domain?.domain || "N/A",
      completed_date: new Date(execution.executed_at).toLocaleDateString('pt-BR'),
      checklist: checklistText || "Nenhum item registrado",
      notes: execution.notes || ""
    };

    console.log("Reenviando notificação via sistema de templates:", clientData);

    // USAR O SISTEMA DE NOTIFICAÇÕES ao invés do template antigo
    const { error: notifyError } = await supabase.functions.invoke(
      "send-notification",
      {
        body: {
          event_type: "maintenance_completed",
          data: clientData,
          reference_type: "maintenance",
          reference_id: maintenance_execution_id
        },
      }
    );

    if (notifyError) throw notifyError;

    // Atualizar execução como enviada
    const { error: updateError } = await supabase
      .from("maintenance_executions")
      .update({
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq("id", maintenance_execution_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "WhatsApp enviado com sucesso" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
