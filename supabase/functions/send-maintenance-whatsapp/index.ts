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

    // Buscar dados da execução
    const { data: execution, error: execError } = await supabase
      .from("maintenance_executions")
      .select(`
        *,
        plan:client_maintenance_plans(
          client:clients(id, full_name, nickname, company_name, phone),
          domain:domains(domain)
        )
      `)
      .eq("id", maintenance_execution_id)
      .single();

    if (execError) throw execError;

    // Buscar itens da execução
    const { data: items, error: itemsError } = await supabase
      .from("maintenance_execution_items")
      .select(`
        *,
        item:maintenance_checklist_items(name)
      `)
      .eq("maintenance_execution_id", maintenance_execution_id)
      .neq("status", "skipped");

    if (itemsError) throw itemsError;

    // Buscar configurações
    const { data: settings, error: settingsError } = await supabase
      .from("maintenance_settings")
      .select("*")
      .single();

    if (settingsError) throw settingsError;

    // Montar checklist formatado
    let checklistText = "\n";
    items?.forEach((item: any) => {
      const icon = item.status === "done" ? "✅" : "☑️";
      const statusText = item.status === "done" ? "Realizado" : "Não houve necessidade";
      checklistText += `${icon} ${item.item.name}: ${statusText}\n`;
    });

    // Preparar variáveis do template
    const clientName = execution.plan?.client?.nickname || 
                      execution.plan?.client?.company_name || 
                      execution.plan?.client?.full_name;
    const siteUrl = execution.plan?.domain?.domain || "seu site";

    // Substituir variáveis no template
    let message = settings.whatsapp_template
      .replace(/{cliente_nome}/g, clientName)
      .replace(/{site_url}/g, siteUrl)
      .replace(/{checklist}/g, checklistText)
      .replace(/{assinatura}/g, settings.message_signature);

    // Enviar WhatsApp
    const clientPhone = execution.plan?.client?.phone;
    if (!clientPhone) {
      throw new Error("Cliente não possui telefone cadastrado");
    }

    const { error: whatsappError } = await supabase.functions.invoke(
      "send-whatsapp",
      {
        body: {
          action: "send_message",
          phone: clientPhone,
          message: message,
        },
      }
    );

    if (whatsappError) throw whatsappError;

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
