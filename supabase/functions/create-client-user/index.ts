import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  clientId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, fullName, clientId }: CreateUserRequest = await req.json();

    console.log('Creating user for client:', clientId);

    // Create user using admin client (doesn't auto-login)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      if (createError.message.includes('already registered') || createError.message.includes('User already registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Email já cadastrado',
            message: 'Este email já possui uma conta no sistema.' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw createError;
    }

    if (!userData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log('User created successfully:', userData.user.id);

    // Update client with user_id
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ user_id: userData.user.id })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error updating client:', updateError);
      throw updateError;
    }

    console.log('Client updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user.id,
        message: 'Acesso criado com sucesso' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-client-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao criar acesso',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
