import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking SLA for tickets...');

    // Buscar tickets com SLA próximo de estourar (dentro de 1 hora)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    const { data: slaTracking, error: trackingError } = await supabase
      .from('ticket_sla_tracking')
      .select(`
        *,
        tickets (
          id,
          ticket_number,
          subject,
          assigned_to,
          client_id,
          clients (
            id,
            full_name,
            company_name,
            responsible_name
          )
        )
      `)
      .or(`first_response_due_at.lte.${oneHourFromNow},resolution_due_at.lte.${oneHourFromNow}`)
      .eq('first_response_breached', false)
      .eq('resolution_breached', false);

    if (trackingError) {
      console.error('Error fetching SLA tracking:', trackingError);
      throw trackingError;
    }

    console.log(`Found ${slaTracking?.length || 0} tickets with SLA at risk`);

    // Criar notificações para cada ticket
    const notifications = [];
    
    for (const tracking of slaTracking || []) {
      const ticket = tracking.tickets as any;
      if (!ticket) continue;

      const client = ticket.clients;
      const clientName = client?.company_name || client?.responsible_name || client?.full_name || 'Cliente';
      
      // Notificar o técnico atribuído
      if (ticket.assigned_to) {
        const timeUntilBreach = tracking.first_response_due_at 
          ? new Date(tracking.first_response_due_at).getTime() - Date.now()
          : new Date(tracking.resolution_due_at).getTime() - Date.now();
        
        const minutes = Math.floor(timeUntilBreach / (60 * 1000));
        
        notifications.push({
          user_id: ticket.assigned_to,
          title: `⏰ SLA próximo de estourar - Ticket #${ticket.ticket_number}`,
          description: `O ticket "${ticket.subject}" de ${clientName} está a ${minutes} minutos de estourar o SLA.`,
          type: 'warning',
          reference_type: 'ticket',
          reference_id: ticket.id,
        });
      }
    }

    // Inserir notificações
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} SLA warning notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedTickets: slaTracking?.length || 0,
        notificationsCreated: notifications.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-ticket-sla:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});