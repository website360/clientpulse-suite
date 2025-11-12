import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppSettings {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

async function getWhatsAppSettings(supabase: any): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .in("key", ["whatsapp_enabled", "whatsapp_api_url", "whatsapp_api_key", "whatsapp_instance_name"]);

  if (error) {
    console.error("Error fetching WhatsApp settings:", error);
    return null;
  }

  const settingsMap = data?.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (!settingsMap?.whatsapp_enabled || settingsMap.whatsapp_enabled !== "true") {
    console.log("WhatsApp integration is disabled");
    return null;
  }

  return {
    enabled: true,
    apiUrl: settingsMap.whatsapp_api_url?.replace(/\/$/, ''), // Remove trailing slash
    apiKey: settingsMap.whatsapp_api_key,
    instanceName: settingsMap.whatsapp_instance_name,
  };
}

async function checkInstanceStatus(settings: WhatsAppSettings): Promise<any> {
  try {
    const url = `${settings.apiUrl}/instance/connectionState/${settings.instanceName}`;
    console.log(`Checking status at: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': settings.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Status check failed: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Instance status:", data);
    return data;
  } catch (error: any) {
    console.error("Error checking instance status:", error);
    throw error;
  }
}

async function sendTextMessage(settings: WhatsAppSettings, phone: string, message: string): Promise<any> {
  try {
    // Ensure phone is in correct format (numbers only)
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      throw new Error("Número de telefone inválido. Use o formato internacional sem +");
    }

    const url = `${settings.apiUrl}/message/sendText/${settings.instanceName}`;
    console.log(`Sending message to ${cleanPhone} via: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': settings.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Send message failed: ${response.status} - ${errorText}`);
      
      // Check if number doesn't exist on WhatsApp
      if (errorText.includes('"exists":false')) {
        throw new Error(`Número ${cleanPhone} não possui WhatsApp ativo`);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Message sent successfully:", data);
    return data;
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const body = await req.json();
    const { action, phone, message, ticket_id, message_id, event_type } = body;

    console.log(`WhatsApp function called with action: ${action}`);

    // Get WhatsApp settings
    const settings = await getWhatsAppSettings(supabase);
    
    if (!settings) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp integration is not configured or disabled" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required settings
    if (!settings.apiUrl || !settings.apiKey || !settings.instanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp settings are incomplete. Please check API URL, API Key and Instance Name" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle different actions
    switch (action) {
      case 'check_status': {
        const status = await checkInstanceStatus(settings);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: status.state || status.instance?.state || 'unknown',
            data: status
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'send_message': {
        if (!phone || !message) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Phone and message are required" 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await sendTextMessage(settings, phone, message);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: result 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'send_ticket_notification': {
        // Deprecated path – all notifications são disparadas via send-notification
        console.log('Deprecated action send_ticket_notification called; ignoring. Use send-notification.');
        return new Response(
          JSON.stringify({ success: true, message: 'Deprecated action ignored. Use send-notification.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CASO 3: Usuário/contato envia mensagem em ticket criado por contato
      if (event_type === 'ticket_message' && isContactCreated) {
        // Enviar para admin
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (adminUsers) {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', adminUsers.user_id)
            .maybeSingle();

          if (adminProfile?.phone) {
            const adminMessageText = `💬 *Nova Mensagem no Ticket #${ticket.ticket_number}*\n\n` +
              `Contato: ${contactData.name}\n` +
              `Cliente: ${clientName}\n` +
              `Assunto: ${ticket.subject}`;

            let cleanAdminPhone = adminProfile.phone.replace(/\D/g, '');
            if (!cleanAdminPhone.startsWith('55')) cleanAdminPhone = '55' + cleanAdminPhone;

            try {
              const adminResult = await sendTextMessage(settings, cleanAdminPhone, adminMessageText);
              results.push({ recipient: 'admin', success: true, data: adminResult });
            } catch (error: any) {
              console.error('Error sending to admin:', error);
              results.push({ recipient: 'admin', success: false, error: error.message });
            }
          }
        }

        // Log notification to prevent duplicates
        await supabase.from('whatsapp_notification_log').insert({
          ticket_id: ticket_id,
          event_type: event_type
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Notifications sent', results }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CASO 4: Fluxo padrão (ticket NÃO criado por contato)
      let recipientPhone = '';
      let messageText = '';

      if (event_type === 'ticket_created' || event_type === 'ticket_message') {
        // Send to admin
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (!adminUsers) {
          return new Response(
            JSON.stringify({ success: true, message: 'No admin user found' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', adminUsers.user_id)
          .maybeSingle();

        if (!adminProfile?.phone) {
          return new Response(
            JSON.stringify({ success: true, message: 'Admin phone not configured' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        recipientPhone = adminProfile.phone;
        
        if (event_type === 'ticket_created') {
          messageText = `🎫 *Novo Ticket Aberto*\n\n` +
            `Número: #${ticket.ticket_number}\n` +
            `Cliente: ${clientName}\n` +
            `Departamento: ${department.name}\n` +
            `Assunto: ${ticket.subject}\n` +
            `Prioridade: ${ticket.priority === 'urgent' ? '🔴 Urgente' : ticket.priority === 'high' ? '🟠 Alta' : ticket.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}`;
        } else if (event_type === 'ticket_message') {
          messageText = `💬 *Nova Mensagem no Ticket #${ticket.ticket_number}*\n\n` +
            `Cliente: ${clientName}\n` +
            `Assunto: ${ticket.subject}`;
        }
      } else {
        // Send to client for admin actions
        if (!client.phone) {
          return new Response(
            JSON.stringify({ success: true, message: 'Client phone not configured' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        recipientPhone = client.phone;

        const statusLabels: Record<string, string> = {
          waiting: 'Aguardando',
          in_progress: 'Em Atendimento',
          resolved: 'Resolvido',
          closed: 'Concluído',
        };

        if (event_type === 'admin_response') {
          messageText = `💬 *Nova Resposta no Ticket #${ticket.ticket_number}*\n\n` +
            `Assunto: ${ticket.subject}\n` +
            `O suporte respondeu ao seu ticket.`;
        } else if (event_type === 'status_changed') {
          messageText = `🔄 *Status do Ticket #${ticket.ticket_number} Atualizado*\n\n` +
            `Assunto: ${ticket.subject}\n` +
            `Novo Status: ${statusLabels[ticket.status] || ticket.status}`;
        } else if (event_type === 'ticket_deleted') {
          messageText = `🗑️ *Ticket #${ticket.ticket_number} Excluído*\n\n` +
            `Assunto: ${ticket.subject}\n` +
            `Este ticket foi excluído.`;
        }
      }

      let cleanPhone = recipientPhone.replace(/\D/g, '');
      if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

      const result = await sendTextMessage(settings, cleanPhone, messageText);
      
      // Log notification to prevent duplicates
      await supabase.from('whatsapp_notification_log').insert({
        ticket_id: ticket_id,
        event_type: event_type
      });
      
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Unknown action: ${action}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    
    // Log more details for Supabase errors
    if (error.code) {
      console.error("Supabase error code:", error.code);
      console.error("Supabase error details:", error.details);
      console.error("Supabase error hint:", error.hint);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        ...(error.code && { code: error.code, details: error.details })
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
