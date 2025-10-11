import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { clientId } = await req.json();

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('asaas_customers')
      .select('asaas_customer_id')
      .eq('client_id', clientId)
      .single();

    if (existingCustomer) {
      return new Response(
        JSON.stringify({ 
          success: true,
          asaasCustomerId: existingCustomer.asaas_customer_id,
          message: 'Customer already exists in Asaas'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Get Asaas settings
    const { data: settings } = await supabase
      .from('asaas_settings')
      .select('environment')
      .single();

    const environment = settings?.environment || 'sandbox';
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');

    if (!asaasApiKey) {
      throw new Error('Asaas API Key not configured');
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Prepare customer data for Asaas
    const customerData: any = {
      name: client.client_type === 'pf' ? client.full_name : client.company_name,
      email: client.email,
      phone: client.phone?.replace(/\D/g, ''),
      mobilePhone: client.phone?.replace(/\D/g, ''),
      cpfCnpj: client.cpf_cnpj?.replace(/\D/g, ''),
      postalCode: client.address_cep?.replace(/\D/g, ''),
      address: client.address_street,
      addressNumber: client.address_number,
      complement: client.address_complement,
      province: client.address_neighborhood,
      city: client.address_city,
      state: client.address_state,
    };

    // Remove null/undefined fields
    Object.keys(customerData).forEach(key => {
      if (customerData[key] === null || customerData[key] === undefined || customerData[key] === '') {
        delete customerData[key];
      }
    });

    console.log('Creating Asaas customer:', customerData);

    // Create customer in Asaas
    const response = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Asaas API error:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Failed to create customer in Asaas');
    }

    const asaasCustomer = await response.json();

    // Save customer mapping
    const { error: insertError } = await supabase
      .from('asaas_customers')
      .insert({
        client_id: clientId,
        asaas_customer_id: asaasCustomer.id,
      });

    if (insertError) {
      console.error('Error saving customer mapping:', insertError);
      throw insertError;
    }

    console.log('Asaas customer created successfully:', asaasCustomer.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        asaasCustomerId: asaasCustomer.id,
        message: 'Customer created successfully in Asaas'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating Asaas customer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
