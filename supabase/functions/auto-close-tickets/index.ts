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

    console.log('Checking tickets for auto-close...');

    // Buscar configuração de fechamento automático
    const { data: config, error: configError } = await supabase
      .from('ticket_auto_close_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.log('No active auto-close config found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auto-close config: ${config.days_after_resolved} days after resolved`);

    // Calcular data limite
    const daysAgo = new Date(Date.now() - config.days_after_resolved * 24 * 60 * 60 * 1000);

    // Buscar tickets resolvidos há mais tempo que o configurado
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*, clients(full_name, company_name, responsible_name)')
      .eq('status', 'resolved')
      .lt('resolved_at', daysAgo.toISOString());

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      throw ticketsError;
    }

    console.log(`Found ${tickets?.length || 0} tickets to auto-close`);

    let closedCount = 0;

    // Fechar cada ticket
    for (const ticket of tickets || []) {
      // Atualizar status para closed
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (updateError) {
        console.error(`Error closing ticket ${ticket.id}:`, updateError);
        continue;
      }

      // Criar mensagem interna no ticket
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        user_id: ticket.assigned_to || ticket.created_by,
        message: `✅ Ticket fechado automaticamente após ${config.days_after_resolved} dias resolvido.`,
        is_internal: true,
      });

      // Notificar cliente
      const client = ticket.clients as any;
      if (client?.user_id) {
        await supabase.from('notifications').insert({
          user_id: client.user_id,
          title: `Ticket #${ticket.ticket_number} Fechado`,
          description: `Seu ticket "${ticket.subject}" foi fechado automaticamente. Se precisar de mais ajuda, abra um novo ticket.`,
          type: 'info',
          reference_type: 'ticket',
          reference_id: ticket.id,
        });
      }

      closedCount++;
    }

    console.log(`Auto-closed ${closedCount} tickets`);

    return new Response(
      JSON.stringify({
        success: true,
        ticketsClosed: closedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-close-tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});