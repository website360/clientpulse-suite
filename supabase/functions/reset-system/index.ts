import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Senha não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pegar o token de autenticação do header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair usuário do token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuário não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, message: 'Apenas administradores podem resetar o sistema' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar senha do usuário
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ success: false, message: 'Senha incorreta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting system reset for user:', user.id);

    // Deletar dados em ordem (respeitando foreign keys)
    // 1. Notificações
    const { error: notifError } = await supabase.from('notifications').delete().neq('user_id', user.id).gte('created_at', '2000-01-01');
    if (notifError) console.error('Error deleting notifications:', notifError);
    
    // 2. Ticket attachments e messages
    const { error: attachError } = await supabase.from('ticket_attachments').delete().neq('uploaded_by', user.id).gte('created_at', '2000-01-01');
    if (attachError) console.error('Error deleting attachments:', attachError);
    
    const { error: msgError } = await supabase.from('ticket_messages').delete().neq('user_id', user.id).gte('created_at', '2000-01-01');
    if (msgError) console.error('Error deleting messages:', msgError);
    
    const { error: viewError } = await supabase.from('ticket_views').delete().neq('user_id', user.id).gte('created_at', '2000-01-01');
    if (viewError) console.error('Error deleting views:', viewError);
    
    // 3. Tickets
    const { error: ticketError } = await supabase.from('tickets').delete().neq('created_by', user.id).gte('created_at', '2000-01-01');
    if (ticketError) console.error('Error deleting tickets:', ticketError);
    
    // 4. Contratos e domínios
    const { error: contractError } = await supabase.from('contracts').delete().neq('created_by', user.id).gte('created_at', '2000-01-01');
    if (contractError) console.error('Error deleting contracts:', contractError);
    
    const { error: domainError } = await supabase.from('domains').delete().not('created_by', 'is', null).gte('created_at', '2000-01-01');
    if (domainError) console.error('Error deleting domains:', domainError);
    
    // 5. Financeiro
    const { error: recError } = await supabase.from('accounts_receivable').delete().neq('created_by', user.id).gte('created_at', '2000-01-01');
    if (recError) console.error('Error deleting receivables:', recError);
    
    const { error: payError } = await supabase.from('accounts_payable').delete().neq('created_by', user.id).gte('created_at', '2000-01-01');
    if (payError) console.error('Error deleting payables:', payError);
    
    // 6. Contatos de clientes
    const { error: contactError } = await supabase.from('client_contacts').delete().not('user_id', 'is', null).gte('created_at', '2000-01-01');
    if (contactError) console.error('Error deleting contacts:', contactError);
    
    // 7. Clientes
    const { error: clientError } = await supabase.from('clients').delete().not('user_id', 'is', null).gte('created_at', '2000-01-01');
    if (clientError) console.error('Error deleting clients:', clientError);
    
    // 8. Email logs
    const { error: emailError } = await supabase.from('email_logs').delete().not('recipient_user_id', 'is', null).gte('created_at', '2000-01-01');
    if (emailError) console.error('Error deleting email logs:', emailError);

    // 9. Limpar storage (ticket-attachments)
    const { data: files } = await supabase.storage
      .from('ticket-attachments')
      .list();

    if (files && files.length > 0) {
      // Filtrar apenas arquivos que não sejam do usuário admin
      const filesToDelete = files
        .filter(f => !f.name.startsWith(`${user.id}/`) && !f.name.includes('avatars'))
        .map(f => f.name);

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('ticket-attachments')
          .remove(filesToDelete);
      }
    }

    console.log('System reset completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sistema resetado com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error resetting system:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Erro ao resetar sistema' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});