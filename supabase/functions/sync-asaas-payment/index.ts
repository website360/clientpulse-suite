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
      .select('*')
      .eq('id', receivableId)
      .single();

    if (receivableError || !receivable) {
      throw new Error('Receivable not found');
    }

    if (!receivable.asaas_payment_id) {
      throw new Error('Receivable is not synced with Asaas');
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

    console.log('Syncing payment from Asaas:', receivable.asaas_payment_id);

    // Fetch payment from Asaas
    const response = await fetch(`${baseUrl}/payments/${receivable.asaas_payment_id}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Asaas API error:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Failed to fetch payment from Asaas');
    }

    const asaasPayment = await response.json();

    // Prepare update data
    const updateData: any = {
      asaas_status: asaasPayment.status,
      asaas_invoice_url: asaasPayment.invoiceUrl,
      asaas_billing_type: asaasPayment.billingType,
    };

    // Update status if payment was confirmed/received
    if (asaasPayment.status === 'CONFIRMED' || asaasPayment.status === 'RECEIVED') {
      updateData.status = 'paid';
      updateData.payment_date = asaasPayment.paymentDate || asaasPayment.confirmedDate;
      updateData.payment_confirmation_date = asaasPayment.confirmedDate;
    } else if (asaasPayment.status === 'OVERDUE') {
      updateData.status = 'overdue';
    }

    // Update receivable
    const { error: updateError } = await supabase
      .from('accounts_receivable')
      .update(updateData)
      .eq('id', receivableId);

    if (updateError) {
      console.error('Error updating receivable:', updateError);
      throw updateError;
    }

    console.log('Payment synced successfully:', asaasPayment.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: asaasPayment.status,
        invoiceUrl: asaasPayment.invoiceUrl,
        message: 'Payment synced successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error syncing Asaas payment:', error);
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
