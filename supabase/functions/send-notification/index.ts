import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  event_type: string;
  data?: Record<string, any>;
  reference_type?: string;
  reference_id?: string;
  // Modo de teste
  is_test?: boolean;
  template_id?: string;
  channel?: string;
  recipient?: string;
  variables?: Record<string, any>;
}

function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    // Suporta tanto {variable} quanto {{variable}}
    const regex1 = new RegExp(`\\{${key}\\}`, 'g');
    const regex2 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex1, String(value || ''));
    result = result.replace(regex2, String(value || ''));
  }
  
  // Remove variáveis não substituídas
  result = result.replace(/\{\{?[^}]+\}\}?/g, '');
  
  return result;
}

async function sendChannelNotification(
  supabase: any,
  channel: string,
  recipient: string,
  subject: string | null,
  message: string
): Promise<any> {
  console.log(`Sending notification via ${channel} to ${recipient}`);

  try {
    switch (channel) {
      case 'email':
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipient,
            subject: subject || 'Notificação',
            html: message.replace(/\n/g, '<br>'),
            text: message,
          }
        });
        if (emailError) throw emailError;
        return { success: true, data: emailData };

      case 'telegram':
        const { data: telegramData, error: telegramError } = await supabase.functions.invoke('send-telegram', {
          body: {
            chat_id: recipient,
            message: message,
            parse_mode: 'Markdown',
          }
        });
        if (telegramError) throw telegramError;
        return { success: true, data: telegramData };

      case 'sms':
        const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: recipient,
            message: message.substring(0, 160), // Limite SMS
          }
        });
        if (smsError) throw smsError;
        return { success: true, data: smsData };

      case 'whatsapp':
        const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            action: 'send_message',
            phone: recipient,
            message: message,
          }
        });
        if (whatsappError) throw whatsappError;
        return { success: true, data: whatsappData };

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  } catch (error) {
    console.error(`Error sending via ${channel}:`, error);
    throw error;
  }
}

async function getRecipients(
  supabase: any,
  template: any,
  data: Record<string, any>
): Promise<Array<{ type: string; email?: string; phone?: string; telegram_id?: string }>> {
  const recipients: Array<any> = [];

  // Admins
  if (template.send_to_admins) {
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('email, phone')
      .in('id', 
        supabase.from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
      );

    if (!adminError && adminProfiles) {
      adminProfiles.forEach((admin: any) => {
        if (admin.email) recipients.push({ type: 'admin', email: admin.email, phone: admin.phone });
      });
    }
  }

  // Cliente
  if (template.send_to_client && data.client_email) {
    recipients.push({
      type: 'client',
      email: data.client_email,
      phone: data.client_phone,
    });
  }

  // Atribuído
  if (template.send_to_assigned && data.assigned_email) {
    recipients.push({
      type: 'assigned',
      email: data.assigned_email,
      phone: data.assigned_phone,
    });
  }

  return recipients;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      event_type, 
      data, 
      reference_type, 
      reference_id,
      is_test,
      template_id,
      channel: testChannel,
      recipient: testRecipient,
      variables: testVariables
    }: NotificationRequest = await req.json();

    // Modo de teste
    if (is_test) {
      if (!template_id || !testChannel || !testRecipient) {
        return new Response(
          JSON.stringify({ error: 'Test mode requires: template_id, channel, recipient' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Test mode: sending via ${testChannel} to ${testRecipient}`);

      // Buscar template específico
      const { data: template, error: templateError } = await supabaseClient
        .from('notification_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Usar variáveis de teste
      const testData = testVariables || {};
      const subject = template.template_subject 
        ? replaceVariables(template.template_subject, testData)
        : null;
      const message = replaceVariables(template.template_body, testData);

      try {
        // Enviar notificação de teste
        await sendChannelNotification(
          supabaseClient,
          testChannel,
          testRecipient,
          subject,
          message
        );

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Test notification sent successfully',
            preview: { subject, message }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Test notification failed:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send test notification',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Modo normal
    if (!event_type || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type, data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing notification for event: ${event_type}`);

    // Buscar templates ativos para este evento
    const { data: templates, error: templatesError } = await supabaseClient
      .from('notification_templates')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true);

    if (templatesError) throw templatesError;

    if (!templates || templates.length === 0) {
      console.log(`No active templates found for event: ${event_type}`);
      return new Response(
        JSON.stringify({ message: 'No active templates for this event' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const template of templates) {
      console.log(`Processing template: ${template.name}`);

      // Substituir variáveis no subject e body
      const subject = template.template_subject 
        ? replaceVariables(template.template_subject, data)
        : null;
      const message = replaceVariables(template.template_body, data);

      // Obter destinatários
      const recipients = await getRecipients(supabaseClient, template, data);

      if (recipients.length === 0) {
        console.log(`No recipients found for template: ${template.name}`);
        continue;
      }

      // Enviar para cada canal configurado
      for (const channel of template.channels) {
        for (const recipient of recipients) {
          let recipientAddress: string | null = null;

          // Determinar endereço do destinatário baseado no canal
          switch (channel) {
            case 'email':
              recipientAddress = recipient.email || null;
              break;
            case 'telegram':
              recipientAddress = recipient.telegram_id || null;
              break;
            case 'sms':
            case 'whatsapp':
              recipientAddress = recipient.phone || null;
              break;
          }

          if (!recipientAddress) {
            console.log(`No ${channel} address for recipient ${recipient.type}`);
            continue;
          }

          // Criar log de notificação
          const logEntry = {
            template_id: template.id,
            event_type: event_type,
            channel: channel,
            recipient: recipientAddress,
            subject: subject,
            message: message,
            reference_type: reference_type,
            reference_id: reference_id,
            status: 'pending',
          };

          try {
            // Enviar notificação
            await sendChannelNotification(
              supabaseClient,
              channel,
              recipientAddress,
              subject,
              message
            );

            // Atualizar log como enviado
            logEntry.status = 'sent';
            const { error: logError } = await supabaseClient
              .from('notification_logs')
              .insert({
                ...logEntry,
                sent_at: new Date().toISOString(),
              });

            if (logError) console.error('Error saving log:', logError);

            results.push({
              template: template.name,
              channel: channel,
              recipient: recipientAddress,
              status: 'sent',
            });
          } catch (error) {
            console.error(`Failed to send ${channel} to ${recipientAddress}:`, error);

            // Salvar log com erro
            logEntry.status = 'failed';
            await supabaseClient
              .from('notification_logs')
              .insert({
                ...logEntry,
                error_message: error instanceof Error ? error.message : 'Unknown error',
              });

            results.push({
              template: template.name,
              channel: channel,
              recipient: recipientAddress,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
