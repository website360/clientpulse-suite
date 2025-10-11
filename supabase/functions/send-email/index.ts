import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  template_key?: string;
  ticket_id?: string;
  test?: boolean;
  recipient?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: EmailRequest = await req.json();
    console.log("Email request received:", requestData);

    // Fetch email settings
    const { data: settings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Erro ao buscar configurações de email");
    }

    if (!settings) {
      console.log("Email settings not configured or not active");
      return new Response(
        JSON.stringify({ success: false, error: "Configurações de email não ativas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: settings.smtp_secure,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    // Test connection
    if (requestData.test) {
      console.log("Testing SMTP connection...");
      try {
        await client.send({
          from: `${settings.from_name} <${settings.from_email}>`,
          to: requestData.recipient || settings.from_email,
          subject: "Teste de Configuração SMTP",
          content: "Email de Teste\n\nSe você está lendo isso, suas configurações SMTP estão funcionando corretamente!",
          html: "<h2>Email de Teste</h2><p>Se você está lendo isso, suas configurações SMTP estão funcionando corretamente!</p>",
        });

        await client.close();
        console.log("Test email sent successfully");
        return new Response(
          JSON.stringify({ success: true, message: "Email de teste enviado com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error: any) {
        await client.close();
        console.error("SMTP test failed:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", requestData.template_key)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      throw new Error("Template não encontrado ou inativo");
    }

    // Fetch ticket data
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        *,
        client:clients(*),
        department:departments(*),
        assigned:profiles!tickets_assigned_to_fkey(*)
      `)
      .eq("id", requestData.ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      throw new Error("Ticket não encontrado");
    }

    // Get app URL
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

    // Prepare variables for template
    const variables: Record<string, string> = {
      ticket_number: ticket.ticket_number.toString(),
      subject: ticket.subject,
      description: ticket.description,
      client_name: ticket.client.nickname || ticket.client.company_name || ticket.client.full_name,
      department: ticket.department.name,
      priority: getPriorityLabel(ticket.priority),
      status: getStatusLabel(ticket.status),
      url: ticketUrl,
      sender_name: ticket.assigned?.full_name || "Sistema",
      message: "", // Will be set if this is a message notification
    };

    // Replace variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text || "";

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      bodyText = bodyText.replace(regex, value);
    });

    // Collect recipients
    const recipients: string[] = [];

    if (template.send_to_admin) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(email)")
        .eq("role", "admin");

      if (admins) {
        admins.forEach((admin: any) => {
          if (admin.profiles?.email) recipients.push(admin.profiles.email);
        });
      }
    }

    if (template.send_to_client && ticket.client.email) {
      recipients.push(ticket.client.email);
    }

    if (template.send_to_contact && ticket.client.user_id) {
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", ticket.client.user_id)
        .single();

      if (clientProfile?.email) recipients.push(clientProfile.email);
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];
    console.log("Sending to recipients:", uniqueRecipients);

    // Send emails
    const results = [];
    for (const recipient of uniqueRecipients) {
      try {
        await client.send({
          from: `${settings.from_name} <${settings.from_email}>`,
          to: recipient,
          subject: subject,
          content: bodyText,
          html: bodyHtml,
        });

        // Log success
        await supabase.from("email_logs").insert({
          recipient_email: recipient,
          template_key: template.template_key,
          reference_type: "ticket",
          reference_id: ticket.id,
          subject: subject,
          status: "sent",
        });

        results.push({ recipient, success: true });
        console.log(`Email sent to ${recipient}`);
      } catch (error: any) {
        console.error(`Failed to send to ${recipient}:`, error);

        // Log failure
        await supabase.from("email_logs").insert({
          recipient_email: recipient,
          template_key: template.template_key,
          reference_type: "ticket",
          reference_id: ticket.id,
          subject: subject,
          status: "failed",
          error_message: error.message,
        });

        results.push({ recipient, success: false, error: error.message });
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] || priority;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em Andamento",
    waiting: "Aguardando",
    resolved: "Resolvido",
    closed: "Fechado",
  };
  return labels[status] || status;
}
