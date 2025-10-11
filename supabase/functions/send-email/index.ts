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

    // Fetch ticket data (no joins, then fetch related records separately)
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", requestData.ticket_id)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      throw new Error("Ticket não encontrado");
    }

    // Fetch related client, department, assigned profile and creator
    const [
      { data: clientRow },
      { data: departmentRow },
      { data: assignedProfile },
      { data: creatorProfile }
    ] = await Promise.all([
      supabase.from("clients").select("id, full_name, company_name, nickname, email, user_id").eq("id", ticket.client_id).maybeSingle(),
      supabase.from("departments").select("name").eq("id", ticket.department_id).maybeSingle(),
      ticket.assigned_to
        ? supabase.from("profiles").select("full_name, email").eq("id", ticket.assigned_to).maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabase.from("profiles").select("full_name, email").eq("id", ticket.created_by).maybeSingle(),
    ]);

    // Check if creator is admin
    const { data: creatorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ticket.created_by)
      .maybeSingle();

    const isCreatorAdmin = creatorRole?.role === 'admin';

    // Check if creator is a contact
    const { data: creatorContact } = await supabase
      .from("client_contacts")
      .select("id, email")
      .eq("user_id", ticket.created_by)
      .maybeSingle();

    const isCreatorContact = !!creatorContact;

    // Get app URL
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

    // Prepare variables for template
    const variables: Record<string, string> = {
      ticket_number: String(ticket.ticket_number),
      subject: ticket.subject,
      description: ticket.description,
      client_name: clientRow?.nickname || clientRow?.company_name || clientRow?.full_name || "",
      department: departmentRow?.name || "",
      priority: getPriorityLabel(ticket.priority),
      status: getStatusLabel(ticket.status),
      url: ticketUrl,
      sender_name: assignedProfile?.full_name || creatorProfile?.full_name || "Sistema",
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

    // Determine recipients based on template and ticket creator
    const recipients: string[] = [];

    /**
     * LÓGICA DE ENVIO DE EMAILS PARA TICKETS:
     * 
     * 1. Cliente cria/responde ticket → enviar para TODOS os admins
     * 2. Contato cria/responde ticket → enviar para TODOS os admins E para o cliente responsável
     * 3. Admin responde/altera status:
     *    - Se ticket foi criado por cliente → enviar para cliente
     *    - Se ticket foi criado por contato → enviar para contato E para cliente
     */

    // Buscar todos os admins
    const { data: adminRoleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminIds = adminRoleRows?.map((r: any) => r.user_id).filter(Boolean) || [];
    
    let adminEmails: string[] = [];
    if (adminIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", adminIds);
      
      adminEmails = adminProfiles?.map((p: any) => p.email).filter(Boolean) || [];
    }

    // Caso 1: Cliente criou/respondeu → enviar para admins
    if (!isCreatorAdmin && !isCreatorContact && template.send_to_admin) {
      console.log("Caso 1: Cliente criou/respondeu - enviando para admins");
      recipients.push(...adminEmails);
    }

    // Caso 2: Contato criou/respondeu → enviar para admins E cliente responsável
    if (isCreatorContact && !isCreatorAdmin && template.send_to_admin) {
      console.log("Caso 2: Contato criou/respondeu - enviando para admins e cliente");
      recipients.push(...adminEmails);
      
      // Adicionar email do cliente responsável
      if (clientRow?.email) {
        recipients.push(clientRow.email);
      }
    }

    // Caso 3: Admin respondeu/alterou status
    if (isCreatorAdmin) {
      // Verificar se ticket foi criado por contato
      const { data: ticketCreatorContact } = await supabase
        .from("client_contacts")
        .select("id, email, name")
        .eq("user_id", ticket.created_by)
        .maybeSingle();

      if (ticketCreatorContact) {
        // Ticket criado por contato → enviar para contato E cliente
        console.log("Caso 3a: Admin respondeu ticket de contato - enviando para contato e cliente");
        
        if (template.send_to_contact && ticketCreatorContact.email) {
          recipients.push(ticketCreatorContact.email);
        }
        
        if (template.send_to_client && clientRow?.email) {
          recipients.push(clientRow.email);
        }
      } else {
        // Ticket criado por cliente → enviar apenas para cliente
        console.log("Caso 3b: Admin respondeu ticket de cliente - enviando para cliente");
        
        if (template.send_to_client && clientRow?.email) {
          recipients.push(clientRow.email);
        }
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];
    
    console.log("Creator email:", creatorProfile?.email);
    console.log("Is creator admin:", isCreatorAdmin);
    console.log("Is creator contact:", isCreatorContact);
    console.log("Template settings:", {
      send_to_admin: template.send_to_admin,
      send_to_client: template.send_to_client,
      send_to_contact: template.send_to_contact
    });
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
