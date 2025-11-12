import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalSettings {
  days_before_notification: number;
  notification_frequency_days: number;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Checking pending approvals...');

    // Buscar configurações
    const { data: settings, error: settingsError } = await supabase
      .from('approval_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      // Usar configurações padrão se não encontrar
      const defaultSettings: ApprovalSettings = {
        days_before_notification: 3,
        notification_frequency_days: 2,
        email_enabled: true,
        whatsapp_enabled: true,
      };
      console.log('Using default settings:', defaultSettings);
      await processApprovals(supabase, defaultSettings);
    } else {
      console.log('Found settings:', settings);
      await processApprovals(supabase, settings as ApprovalSettings);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Pending approvals checked successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-pending-approvals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processApprovals(supabase: any, settings: ApprovalSettings) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - (settings.days_before_notification * 24 * 60 * 60 * 1000));

  console.log(`Checking approvals older than ${settings.days_before_notification} days...`);
  console.log('Cutoff date:', cutoffDate.toISOString());

  // Buscar aprovações pendentes antigas
  const { data: pendingApprovals, error: approvalsError } = await supabase
    .from('project_stage_approvals')
    .select(`
      *,
      project_stages (
        id,
        title,
        projects (
          id,
          name,
          clients (
            id,
            full_name,
            company_name,
            client_type,
            email,
            phone,
            user_id
          )
        )
      ),
      profiles:requested_by (
        full_name,
        email
      )
    `)
    .eq('status', 'pending')
    .lt('created_at', cutoffDate.toISOString());

  if (approvalsError) {
    console.error('Error fetching pending approvals:', approvalsError);
    throw approvalsError;
  }

  console.log(`Found ${pendingApprovals?.length || 0} pending approvals`);

  if (!pendingApprovals || pendingApprovals.length === 0) {
    console.log('No pending approvals to process');
    return;
  }

  // Processar cada aprovação
  for (const approval of pendingApprovals) {
    try {
      // Verificar se deve enviar notificação baseado na frequência
      const daysSinceCreation = Math.floor((now.getTime() - new Date(approval.created_at).getTime()) / (24 * 60 * 60 * 1000));
      const daysSinceLastNotification = approval.last_notification_sent_at
        ? Math.floor((now.getTime() - new Date(approval.last_notification_sent_at).getTime()) / (24 * 60 * 60 * 1000))
        : 999; // Grande número se nunca foi enviada

      console.log(`Approval ${approval.id}: ${daysSinceCreation} days old, last notification ${daysSinceLastNotification} days ago`);

      // Enviar notificação apenas se:
      // 1. Nunca foi enviada (daysSinceLastNotification >= 999) OU
      // 2. Passou o intervalo de frequência desde a última notificação
      if (daysSinceLastNotification >= settings.notification_frequency_days) {
        console.log(`Sending notification for approval ${approval.id}`);
        await sendApprovalReminder(supabase, approval, settings, daysSinceCreation);

        // Atualizar registro de notificação
        await supabase
          .from('project_stage_approvals')
          .update({
            last_notification_sent_at: now.toISOString(),
            notification_count: (approval.notification_count || 0) + 1,
          })
          .eq('id', approval.id);

        console.log(`Updated notification tracking for approval ${approval.id}`);
      } else {
        console.log(`Skipping approval ${approval.id} - too soon since last notification`);
      }
    } catch (error) {
      console.error(`Error processing approval ${approval.id}:`, error);
      // Continue com as próximas aprovações mesmo se uma falhar
    }
  }
}

async function sendApprovalReminder(
  supabase: any,
  approval: any,
  settings: ApprovalSettings,
  daysPending: number
) {
  const project = approval.project_stages?.projects;
  const client = project?.clients;
  const stage = approval.project_stages;

  if (!project || !client || !stage) {
    console.error('Missing project, client or stage data for approval:', approval.id);
    return;
  }

  const clientName = client.client_type === 'pf' 
    ? client.full_name 
    : client.company_name;

  const approvalUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://pjnbsuwkxzxcfaetywjs.supabase.co', window.location?.origin || 'https://sistema.com')}/approval/${approval.approval_token}`;

  const notificationData = {
    event_type: 'approval_reminder',
    data: {
      project_name: project.name,
      stage_name: stage.title,
      client_name: clientName,
      client_email: client.email,
      client_phone: client.phone,
      days_pending: daysPending,
      notification_count: (approval.notification_count || 0) + 1,
      approval_url: approvalUrl,
      urgency_level: daysPending > 7 ? 'high' : daysPending > 5 ? 'medium' : 'normal',
    },
    reference_type: 'project',
    reference_id: project.id,
  };

  console.log('Sending notification with data:', notificationData);

  // Enviar notificação via função send-notification
  const { error: notificationError } = await supabase.functions.invoke('send-notification', {
    body: notificationData,
  });

  if (notificationError) {
    console.error('Error sending notification:', notificationError);
    throw notificationError;
  }

  console.log(`Notification sent successfully for approval ${approval.id}`);

  // Criar notificação interna para admins
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (admins && admins.length > 0) {
    const urgencyText = daysPending > 7 ? 'URGENTE: ' : '';
    const notifications = admins.map((admin: any) => ({
      user_id: admin.user_id,
      title: `${urgencyText}Aprovação pendente há ${daysPending} dias`,
      description: `O cliente ${clientName} ainda não aprovou a etapa "${stage.title}" do projeto "${project.name}"`,
      type: daysPending > 7 ? 'error' : daysPending > 5 ? 'warning' : 'info',
      reference_type: 'project',
      reference_id: project.id,
    }));

    await supabase.from('notifications').insert(notifications);
    console.log(`Created ${notifications.length} internal notifications for admins`);
  }
}
