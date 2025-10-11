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
    await supabase.from('notifications').delete().neq('user_id', user.id);
    
    // 2. Ticket attachments e messages
    await supabase.from('ticket_attachments').delete().neq('uploaded_by', user.id);
    await supabase.from('ticket_messages').delete().neq('user_id', user.id);
    await supabase.from('ticket_views').delete().neq('user_id', user.id);
    
    // 3. Tickets
    await supabase.from('tickets').delete().neq('created_by', user.id);
    
    // 4. Contratos e domínios
    await supabase.from('contracts').delete().neq('created_by', user.id);
    await supabase.from('domains').delete().neq('created_by', user.id);
    
    // 5. Financeiro
    await supabase.from('accounts_receivable').delete().neq('created_by', user.id);
    await supabase.from('accounts_payable').delete().neq('created_by', user.id);
    
    // 6. Contatos de clientes
    await supabase.from('client_contacts').delete().neq('user_id', user.id);
    
    // 7. Clientes
    await supabase.from('clients').delete().neq('user_id', user.id);
    
    // 8. Email logs
    await supabase.from('email_logs').delete().neq('recipient_user_id', user.id);

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