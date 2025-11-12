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
    const { ticketId } = await req.json();

    if (!ticketId) {
      throw new Error('ticketId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Auto-assigning ticket ${ticketId}...`);

    // Buscar informações do ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, department:departments(id)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Buscar usuários que podem atender tickets deste departamento
    // (admins ou usuários com permissão específica)
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError || !admins || admins.length === 0) {
      throw new Error('No available users to assign');
    }

    const adminIds = admins.map(a => a.user_id);

    // Contar tickets atuais de cada admin (carga de trabalho)
    const { data: workload, error: workloadError } = await supabase
      .from('tickets')
      .select('assigned_to')
      .in('assigned_to', adminIds)
      .in('status', ['waiting', 'in_progress']);

    if (workloadError) {
      console.error('Error fetching workload:', workloadError);
    }

    // Calcular carga de cada admin
    const adminWorkload: Record<string, number> = {};
    adminIds.forEach(id => { adminWorkload[id] = 0; });
    
    workload?.forEach(t => {
      if (t.assigned_to) {
        adminWorkload[t.assigned_to] = (adminWorkload[t.assigned_to] || 0) + 1;
      }
    });

    // Encontrar admin com menor carga
    let minWorkload = Infinity;
    let assignedTo = null;
    
    for (const adminId of adminIds) {
      const load = adminWorkload[adminId] || 0;
      if (load < minWorkload) {
        minWorkload = load;
        assignedTo = adminId;
      }
    }

    if (!assignedTo) {
      throw new Error('Could not determine user to assign');
    }

    // Atualizar ticket
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        assigned_to: assignedTo,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (updateError) {
      throw updateError;
    }

    // Criar notificação
    await supabase.from('notifications').insert({
      user_id: assignedTo,
      title: `📋 Novo Ticket Atribuído - #${ticket.ticket_number}`,
      description: `O ticket "${ticket.subject}" foi automaticamente atribuído a você.`,
      type: 'info',
      reference_type: 'ticket',
      reference_id: ticketId,
    });

    // Criar mensagem interna
    await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      user_id: assignedTo,
      message: `🤖 Ticket atribuído automaticamente baseado na carga de trabalho da equipe.`,
      is_internal: true,
    });

    console.log(`Ticket ${ticketId} assigned to ${assignedTo} (workload: ${minWorkload})`);

    return new Response(
      JSON.stringify({
        success: true,
        assignedTo,
        workload: minWorkload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-assign-ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});