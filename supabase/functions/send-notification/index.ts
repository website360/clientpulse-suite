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

function normalizePhone(input: string): string {
  if (!input) return '';
  
  // Remove tudo exceto dígitos
  let phone = String(input).replace(/\D/g, '');
  
  // Remove zeros à esquerda
  phone = phone.replace(/^0+/, '');
  
  // Se não começar com 55 e tiver 10-11 dígitos (formato nacional brasileiro), adicionar prefixo 55
  if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) {
    phone = '55' + phone;
  }
  
  return phone;
}

function buildAliasMap(eventType: string): Record<string, string> {
  const aliases: Record<string, string> = {
    // Common aliases (portuguese/english)
    'nome': 'client_name',
    'nome_cliente': 'client_name',
    'cliente': 'client_name',
    'cliente_nome': 'client_name',
    'customer_name': 'client_name',

    'numero': 'ticket_number',
    'número': 'ticket_number',
    'num_ticket': 'ticket_number',
    'ticket_no': 'ticket_number',
    'ticket': 'ticket_number',

    'assunto': 'subject',

    'descricao': 'description',
    'descrição': 'description',

    'departamento': 'department',

    'prioridade': 'priority',

    'criado_em': 'created_at',
    'data_criacao': 'created_at',
    'data_criação': 'created_at',

    'url_ticket': 'ticket_url',
    'link_ticket': 'ticket_url',
    'link': 'ticket_url',
  };

  // Event-specific aliases (extend when needed)
  if (eventType === 'payment_due' || eventType === 'payment_overdue' || eventType === 'payment_received') {
    aliases['valor'] = 'amount';
    aliases['valor_total'] = 'amount';
    aliases['data_vencimento'] = 'due_date';
    aliases['vencimento'] = 'due_date';
  }

  // Maintenance events aliases
  if (eventType === 'maintenance_completed' || eventType === 'maintenance_scheduled') {
    // Site/domain
    aliases['dominio'] = 'site_url';
    aliases['domínio'] = 'site_url';
    aliases['site'] = 'site_url';
    aliases['url_site'] = 'site_url';

    // Dates
    if (eventType === 'maintenance_completed') {
      aliases['data'] = 'completed_date';
      aliases['data_execucao'] = 'completed_date';
      aliases['data_execução'] = 'completed_date';
    } else {
      aliases['data'] = 'scheduled_date';
      aliases['data_programada'] = 'scheduled_date';
      aliases['horario'] = 'scheduled_time';
    }

    // Executor
    aliases['executado_por'] = 'executed_by_name';
    aliases['executor'] = 'executed_by_name';
    aliases['tecnico'] = 'executed_by_name';
    aliases['técnico'] = 'executed_by_name';

    // Signature
    aliases['assinatura'] = 'signature';

    // Checklist common typos and variants
    aliases['checklist'] = 'checklist';
    aliases['check_list'] = 'checklist';
    aliases['lista_de_checagem'] = 'checklist';
    aliases['chaklist'] = 'checklist';
    aliases['cheklist'] = 'checklist';
  }

  return aliases;
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function enrichData(eventType: string, data: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = {};
  const aliases = buildAliasMap(eventType);

  // Original keys (normalized)
  for (const [k, v] of Object.entries(data || {})) {
    enriched[normalizeKey(k)] = v;
  }

  // Alias copies
  for (const [alias, canonical] of Object.entries(aliases)) {
    const nAlias = normalizeKey(alias);
    const nCanonical = normalizeKey(canonical);
    if (enriched[nAlias] !== undefined && enriched[nCanonical] === undefined) {
      enriched[nCanonical] = enriched[nAlias];
    }
  }

  return enriched;
}

function replaceVariablesFlexible(template: string, eventType: string, data: Record<string, any>): string {
  if (!template) return '';
  const enriched = enrichData(eventType, data || {});
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}|\{\s*([^}]+?)\s*\}/g, (_m, p1, p2) => {
    const rawKey = (p1 || p2 || '').trim();
    const key = normalizeKey(rawKey);
    const val = enriched[key];
    return val === undefined || val === null ? '' : String(val);
  });
}

// Enriquecer dados com variáveis específicas por evento (ex.: manutenção)
async function getEventExtras(
  supabase: any,
  eventType: string,
  data: Record<string, any>,
  referenceType?: string | null,
  referenceId?: string | null
): Promise<Record<string, any>> {
  const extras: Record<string, any> = {};

  try {
    // Assinatura comum em manutenção
    if (eventType.startsWith('maintenance_')) {
      const { data: mSettings } = await supabase
        .from('maintenance_settings')
        .select('message_signature')
        .single();
      if (mSettings?.message_signature) extras.signature = mSettings.message_signature;
    }

    // Complementos da execução de manutenção
    if (eventType === 'maintenance_completed' && referenceType === 'maintenance' && referenceId) {
      const { data: exec } = await supabase
        .from('maintenance_executions')
        .select('executed_by, executed_at, maintenance_plan_id')
        .eq('id', referenceId)
        .single();

      if (exec?.executed_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', exec.executed_by)
          .single();
        if (profile?.full_name) extras.executed_by_name = profile.full_name;
      }

      // Se não veio site_url, tentar obter pelo plano
      if (!data?.site_url && exec?.maintenance_plan_id) {
        const { data: plan } = await supabase
          .from('client_maintenance_plans')
          .select('domain:domains(domain)')
          .eq('id', exec.maintenance_plan_id)
          .single();
        if (plan?.domain?.domain) extras.site_url = plan.domain.domain;
      }

      // Garantir completed_date formatado se não vier
      if (!data?.completed_date && exec?.executed_at) {
        extras.completed_date = new Date(exec.executed_at).toLocaleDateString('pt-BR');
      }
    }
  } catch (_e) {
    // Silenciar erros de enriquecimento para não quebrar envio
  }

  return extras;
}

async function sendChannelNotification(
  supabase: any,
  channel: string,
  recipient: string,
  subject: string | null,
  message: string,
  htmlMessage?: string | null
): Promise<any> {
  console.log(`Sending notification via ${channel} to ${recipient}`);

  try {
    switch (channel) {
      case 'email':
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipient,
            subject: subject || 'Notificação',
            html: htmlMessage || message.replace(/\n/g, '<br>'),
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

async function getNotificationSettings(
  supabase: any,
  eventType: string
): Promise<any> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('event_type', eventType)
    .is('user_id', null)
    .single();

  if (error) {
    console.log('No settings found, using defaults');
    return {
      email_enabled: true,
      telegram_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      quiet_hours_enabled: false,
    };
  }

  return data;
}

function isQuietHours(settings: any): boolean {
  if (!settings.quiet_hours_enabled) return false;

  const startRaw = settings.quiet_hours_start?.slice?.(0, 5);
  const endRaw = settings.quiet_hours_end?.slice?.(0, 5);

  // Se horários não estão configurados, não aplicar horário de silêncio
  if (!startRaw || !endRaw) return false;

  // Usa horário local do servidor (UTC) por simplicidade; se necessário, adicionar suporte a timezone nas settings
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const start = startRaw;
  const end = endRaw;

  // Se o horário de fim é menor que início, significa que cruza a meia-noite
  if (end < start) {
    return currentTime >= start || currentTime < end;
  }
  
  return currentTime >= start && currentTime < end;
}

function isChannelEnabled(settings: any, channel: string): boolean {
  switch (channel) {
    case 'email':
      return settings.email_enabled ?? true;
    case 'telegram':
      return settings.telegram_enabled ?? true;
    case 'sms':
      return settings.sms_enabled ?? true;
    case 'whatsapp':
      return settings.whatsapp_enabled ?? true;
    default:
      return true;
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
    // First get admin user IDs
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = adminRoles?.map((r: any) => r.user_id) || [];

    // Then get admin profiles if we have IDs
    if (adminIds.length > 0) {
      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('email, phone')
        .in('id', adminIds);

      if (!adminError && adminProfiles) {
        adminProfiles.forEach((admin: any) => {
          // Incluir admin se tiver email OU phone
          if (admin.email || admin.phone) {
            recipients.push({ 
              type: 'admin', 
              email: admin.email || undefined, 
              phone: admin.phone || undefined 
            });
          }
        });
      }
    }
  }

  // Cliente - incluir se tiver email OU phone
  if (template.send_to_client && (data.client_email || data.client_phone)) {
    recipients.push({
      type: 'client',
      email: data.client_email || undefined,
      phone: data.client_phone || undefined,
    });
  }

  // Atribuído - incluir se tiver email OU phone
  if (template.send_to_assigned && (data.assigned_email || data.assigned_phone)) {
    recipients.push({
      type: 'assigned',
      email: data.assigned_email || undefined,
      phone: data.assigned_phone || undefined,
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
      // Enriquecer dados com informações extras (ex.: assinatura, executor, etc.)
      const extraData = await getEventExtras(supabaseClient, template.event_type, testVariables || {}, null, null);
      const testData = { ...(testVariables || {}), ...extraData };
      
      const subject = template.template_subject 
        ? replaceVariablesFlexible(template.template_subject, template.event_type, testData)
        : null;
      const message = replaceVariablesFlexible(template.template_body, template.event_type, testData);
      const htmlMessage = template.template_html 
        ? replaceVariablesFlexible(template.template_html, template.event_type, testData)
        : null;

      try {
        // Normalizar telefone para WhatsApp e SMS
        let finalRecipient = testRecipient;
        if (testChannel === 'whatsapp' || testChannel === 'sms') {
          finalRecipient = normalizePhone(testRecipient);
          console.log(`Test ${testChannel} - Original: ${testRecipient}, Normalized: ${finalRecipient}`);
          
          if (!finalRecipient || finalRecipient.length < 12) {
            return new Response(
              JSON.stringify({ 
                error: 'Número de telefone inválido',
                details: 'Use o formato internacional (E.164) sem +. Ex.: 5511999999999'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Enviar notificação de teste
        await sendChannelNotification(
          supabaseClient,
          testChannel,
          finalRecipient,
          subject,
          message,
          htmlMessage
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a validation error (invalid phone number)
        const isValidationError = errorMessage.includes('não possui WhatsApp') || 
                                  errorMessage.includes('inválido') ||
                                  errorMessage.includes('exists":false');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send test notification',
            details: errorMessage
          }),
          { 
            status: isValidationError ? 400 : 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
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

    // Buscar configurações de notificação
    const settings = await getNotificationSettings(supabaseClient, event_type);
    
    // Verificar horário de silêncio
    if (isQuietHours(settings)) {
      console.log('Currently in quiet hours, skipping notification');
      return new Response(
        JSON.stringify({ message: 'Notification skipped due to quiet hours' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

      // Enriquecer dados com informações extras (ex.: assinatura, executor, etc.)
      const extraData = await getEventExtras(supabaseClient, event_type, data, reference_type, reference_id);
      const enrichedData = { ...data, ...extraData };

      // Substituir variáveis no subject e body
      const subject = template.template_subject 
        ? replaceVariablesFlexible(template.template_subject, event_type, enrichedData)
        : null;
      const message = replaceVariablesFlexible(template.template_body, event_type, enrichedData);
      const htmlMessage = template.template_html 
        ? replaceVariablesFlexible(template.template_html, event_type, enrichedData)
        : null;

      // Obter destinatários
      const recipients = await getRecipients(supabaseClient, template, data);
      const sentSet = new Set<string>();

      if (recipients.length === 0) {
        console.log(`No recipients found for template: ${template.name}`);
        continue;
      }

      // Enviar para cada canal configurado
      for (const channel of template.channels) {
        // Verificar se o canal está habilitado
        if (!isChannelEnabled(settings, channel)) {
          console.log(`Channel ${channel} is disabled for event ${event_type}`);
          continue;
        }

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

          // Normalizar telefone para WhatsApp e SMS
          if (channel === 'whatsapp' || channel === 'sms') {
            const originalPhone = recipientAddress;
            recipientAddress = normalizePhone(recipientAddress);
            console.log(`Recipient ${channel} ${recipient.type} - Original: ${originalPhone}, Normalized: ${recipientAddress}`);
            
            // Validar número normalizado
            if (!recipientAddress || recipientAddress.length < 12) {
              console.log(`Invalid ${channel} number after normalization for ${recipient.type}, skipping`);
              continue;
            }
          }

          // Deduplicar por canal+destinatário durante a execução
          const dedupKey = `${channel}:${recipientAddress}`;
          if (sentSet.has(dedupKey)) {
            console.log(`Duplicate in-memory ${dedupKey}, skipping`);
            continue;
          }
          sentSet.add(dedupKey);

          // Evitar duplicação recente no banco (últimos 30s)
          let recent: any[] | null = null;
          if (reference_id) {
            const { data: r } = await supabaseClient
              .from('notification_logs')
              .select('id, sent_at')
              .eq('event_type', event_type)
              .eq('channel', channel)
              .eq('recipient', recipientAddress)
              .eq('reference_id', reference_id)
              .order('sent_at', { ascending: false })
              .limit(1);
            recent = r;
          } else {
            const { data: r } = await supabaseClient
              .from('notification_logs')
              .select('id, sent_at')
              .eq('event_type', event_type)
              .eq('channel', channel)
              .eq('recipient', recipientAddress)
              .is('reference_id', null)
              .order('sent_at', { ascending: false })
              .limit(1);
            recent = r;
          }
          if (recent && recent.length) {
            const lastTs = new Date(recent[0].sent_at as string).getTime();
            if (Date.now() - lastTs < 30000) {
              console.log(`Recently sent (30s) to ${recipientAddress} on ${channel}, skipping`);
              continue;
            }
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
              message,
              channel === 'email' ? htmlMessage : null
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
