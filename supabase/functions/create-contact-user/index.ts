import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get request body
    const { contactId } = await req.json();

    if (!contactId) {
      throw new Error('Contact ID is required');
    }

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('client_contacts')
      .select('*, clients(id, full_name, company_name)')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

    // Check if contact already has a user
    if (contact.user_id) {
      return new Response(
        JSON.stringify({ error: 'Contact already has system access' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate a temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

    // Create user using Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: contact.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: contact.name,
        is_contact: true,
      },
    });

    if (userError || !userData.user) {
      console.error('Error creating user:', userError);
      throw userError || new Error('Failed to create user');
    }

    // Link user to contact
    const { error: updateError } = await supabase
      .from('client_contacts')
      .update({ user_id: userData.user.id })
      .eq('id', contactId);

    if (updateError) {
      console.error('Error linking user to contact:', updateError);
      // Try to delete the created user if linking fails
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw updateError;
    }

    // Assign 'contato' role (upsert to avoid duplicate key errors)
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userData.user.id,
        role: 'contato',
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        full_name: contact.name,
        email: contact.email,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Non-critical, continue anyway
    }

    console.log('Contact user created successfully:', {
      contactId,
      userId: userData.user.id,
      email: contact.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access granted successfully',
        tempPassword: tempPassword,
        email: contact.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-contact-user function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});