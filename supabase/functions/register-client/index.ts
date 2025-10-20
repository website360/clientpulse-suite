import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Received client registration:', body);

    const {
      client_type,
      company_name,
      full_name,
      cpf_cnpj,
      responsible_cpf,
      birth_date,
      email,
      phone,
      address_cep,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
    } = body;

    // Validação básica
    if (!client_type || !email || !phone) {
      throw new Error('Dados obrigatórios não foram fornecidos');
    }

    if (client_type === 'company' && !company_name) {
      throw new Error('Nome da empresa é obrigatório para pessoa jurídica');
    }

    if (client_type === 'person' && !full_name) {
      throw new Error('Nome completo é obrigatório para pessoa física');
    }

    // Verificar se já existe cliente com este email ou CPF/CNPJ
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .or(`email.eq.${email},cpf_cnpj.eq.${cpf_cnpj}`)
      .maybeSingle();

    if (existingClient) {
      throw new Error('Já existe um cadastro com este email ou CPF/CNPJ');
    }

    // Preparar dados do cliente
    const clientData: any = {
      client_type,
      company_name: client_type === 'company' ? company_name : null,
      full_name: client_type === 'person' ? full_name : null,
      responsible_name: client_type === 'company' ? full_name : null,
      responsible_cpf: client_type === 'company' ? responsible_cpf : null,
      cpf_cnpj,
      email,
      phone,
      address_cep,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      is_active: true,
    };

    // Adicionar data de nascimento se foi fornecida
    if (birth_date) {
      // Converter DD/MM/AAAA para AAAA-MM-DD
      const parts = birth_date.split('/');
      if (parts.length === 3) {
        clientData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Criar cliente
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      throw new Error('Erro ao criar cadastro: ' + clientError.message);
    }

    console.log('Client created successfully:', newClient.id);

    // Se for pessoa jurídica, criar contato automático com os dados do responsável
    if (client_type === 'company' && full_name && responsible_cpf) {
      const contactData: any = {
        client_id: newClient.id,
        name: full_name,
        email: email,
        phone: phone,
        department: 'Responsável',
        cpf: responsible_cpf,
      };

      // Adicionar data de nascimento se foi fornecida
      if (birth_date) {
        const parts = birth_date.split('/');
        if (parts.length === 3) {
          contactData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const { error: contactError } = await supabase
        .from('client_contacts')
        .insert(contactData);

      if (contactError) {
        console.error('Error creating contact:', contactError);
        // Não falha o cadastro se o contato não for criado
      } else {
        console.log('Contact created successfully for company client');
      }
    }

    // Notificar admins sobre novo cadastro
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map(role => ({
        user_id: role.user_id,
        title: 'Novo Cliente Cadastrado',
        description: `${client_type === 'company' ? company_name : full_name} se cadastrou pelo formulário público.`,
        type: 'info',
        reference_type: 'client',
        reference_id: newClient.id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_id: newClient.id,
        message: 'Cadastro realizado com sucesso!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in register-client function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});