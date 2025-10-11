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

    const { receivableId } = await req.json();

    if (!receivableId) {
      throw new Error('Receivable ID is required');
    }

    // Get receivable data
    const { data: receivable, error: receivableError } = await supabase
      .from('accounts_receivable')
      .select('*, clients(*)')
      .eq('id', receivableId)
      .single();

    if (receivableError || !receivable) {
      throw new Error('Receivable not found');
    }

    // Check if payment already exists
    if (receivable.asaas_payment_id) {
      return new Response(
        JSON.stringify({ 
          success: true,
          asaasPaymentId: receivable.asaas_payment_id,
          message: 'Payment already exists in Asaas'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get or create Asaas customer
    let asaasCustomerId = receivable.asaas_customer_id;
    
    if (!asaasCustomerId) {
      const { data: customerMapping } = await supabase
        .from('asaas_customers')
        .select('asaas_customer_id')
        .eq('client_id', receivable.client_id)
        .single();

      if (customerMapping) {
        asaasCustomerId = customerMapping.asaas_customer_id;
      } else {
        // Create customer first
        const createCustomerResponse = await fetch(`${supabaseUrl}/functions/v1/create-asaas-customer`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientId: receivable.client_id }),
        });

        const customerResult = await createCustomerResponse.json();
        if (!customerResult.success) {
          throw new Error(customerResult.error);
        }
        asaasCustomerId = customerResult.asaasCustomerId;
      }
    }

    // Get Asaas settings
    const { data: settings } = await supabase
      .from('asaas_settings')
      .select('*')
      .single();

    const environment = settings?.environment || 'sandbox';
    const defaultBillingType = settings?.default_billing_type || 'UNDEFINED';
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');

    if (!asaasApiKey) {
      throw new Error('Asaas API Key not configured');
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Prepare payment data
    const paymentData: any = {
      customer: asaasCustomerId,
      billingType: defaultBillingType,
      value: parseFloat(receivable.amount),
      dueDate: receivable.due_date,
      description: receivable.description,
      externalReference: receivableId,
    };

    if (receivable.invoice_number) {
      paymentData.invoiceNumber = receivable.invoice_number;
    }

    console.log('Creating Asaas payment:', paymentData);

    // Create payment in Asaas
    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Asaas API error:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Failed to create payment in Asaas');
    }

    const asaasPayment = await response.json();

    // Update receivable with Asaas data
    const { error: updateError } = await supabase
      .from('accounts_receivable')
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_customer_id: asaasCustomerId,
        asaas_invoice_url: asaasPayment.invoiceUrl,
        asaas_status: asaasPayment.status,
        asaas_billing_type: asaasPayment.billingType,
        sync_with_asaas: true,
      })
      .eq('id', receivableId);

    if (updateError) {
      console.error('Error updating receivable:', updateError);
      throw updateError;
    }

    console.log('Asaas payment created successfully:', asaasPayment.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        asaasPaymentId: asaasPayment.id,
        invoiceUrl: asaasPayment.invoiceUrl,
        status: asaasPayment.status,
        message: 'Payment created successfully in Asaas'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating Asaas payment:', error);
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
