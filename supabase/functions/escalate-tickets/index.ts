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

    console.log('Checking tickets for escalation...');

    // Buscar regras de escalonamento ativas
    const { data: rules, error: rulesError } = await supabase
      .from('ticket_escalation_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching escalation rules:', rulesError);
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} active escalation rules`);

    let escalatedCount = 0;

    // Para cada regra, buscar tickets que devem ser escalonados
    for (const rule of rules || []) {
      const hoursAgo = new Date(Date.now() - rule.hours_without_response * 60 * 60 * 1000);
      
      // Buscar tickets sem resposta dentro do período
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*, clients(full_name, company_name, responsible_name)')
        .eq('department_id', rule.department_id)
        .eq('priority', rule.priority)
        .in('status', ['waiting', 'in_progress'])
        .or(`last_response_at.is.null,last_response_at.lt.${hoursAgo.toISOString()}`)
        .neq('assigned_to', rule.escalate_to_user_id); // Não escalonar se já está atribuído ao supervisor

      if (ticketsError) {
        console.error('Error fetching tickets for escalation:', ticketsError);
        continue;
      }

      console.log(`Rule ${rule.id}: Found ${tickets?.length || 0} tickets to escalate`);

      // Escalonar cada ticket
      for (const ticket of tickets || []) {
        // Atualizar assigned_to
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ 
            assigned_to: rule.escalate_to_user_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticket.id);

        if (updateError) {
          console.error(`Error escalating ticket ${ticket.id}:`, updateError);
          continue;
        }

        // Criar notificação para o supervisor
        const client = ticket.clients as any;
        const clientName = client?.company_name || client?.responsible_name || client?.full_name || 'Cliente';
        
        await supabase.from('notifications').insert({
          user_id: rule.escalate_to_user_id,
          title: `🔼 Ticket Escalonado - #${ticket.ticket_number}`,
          description: `O ticket "${ticket.subject}" de ${clientName} foi escalonado para você devido à falta de resposta.`,
          type: 'warning',
          reference_type: 'ticket',
          reference_id: ticket.id,
        });

        // Criar mensagem interna no ticket
        await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          user_id: rule.escalate_to_user_id,
          message: `🔼 Ticket escalonado automaticamente devido à falta de resposta em ${rule.hours_without_response} horas.`,
          is_internal: true,
        });

        escalatedCount++;
      }
    }

    console.log(`Escalated ${escalatedCount} tickets`);

    return new Response(
      JSON.stringify({
        success: true,
        rulesChecked: rules?.length || 0,
        ticketsEscalated: escalatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in escalate-tickets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});