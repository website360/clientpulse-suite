import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook token from settings
    const { data: settings } = await supabase
      .from('asaas_settings')
      .select('webhook_token')
      .single();

    // Validate webhook token if configured
    const webhookToken = req.headers.get('asaas-access-token');
    if (settings?.webhook_token && webhookToken !== settings.webhook_token) {
      console.error('Invalid webhook token');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const payload = await req.json();
    const { event, payment } = payload;

    console.log('Received Asaas webhook:', event, payment?.id);

    // Log webhook
    await supabase.from('asaas_webhooks').insert({
      event_type: event,
      payment_id: payment?.id || 'unknown',
      payload: payload,
      processed: false,
    });

    // Process webhook based on event type
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      // Find receivable by asaas_payment_id
      const { data: receivable } = await supabase
        .from('accounts_receivable')
        .select('id')
        .eq('asaas_payment_id', payment.id)
        .single();

      if (receivable) {
        // Update receivable status
        const updateData: any = {
          status: 'paid',
          asaas_status: payment.status,
          payment_confirmation_date: payment.confirmedDate || new Date().toISOString(),
        };

        if (payment.paymentDate) {
          updateData.payment_date = payment.paymentDate;
        }

        await supabase
          .from('accounts_receivable')
          .update(updateData)
          .eq('id', receivable.id);

        console.log('Receivable updated to paid:', receivable.id);
      }

      // Mark webhook as processed
      await supabase
        .from('asaas_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('payment_id', payment.id)
        .eq('event_type', event);

    } else if (event === 'PAYMENT_OVERDUE') {
      // Update to overdue status
      const { data: receivable } = await supabase
        .from('accounts_receivable')
        .select('id')
        .eq('asaas_payment_id', payment.id)
        .single();

      if (receivable) {
        await supabase
          .from('accounts_receivable')
          .update({
            status: 'overdue',
            asaas_status: payment.status,
          })
          .eq('id', receivable.id);

        console.log('Receivable updated to overdue:', receivable.id);
      }

      await supabase
        .from('asaas_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('payment_id', payment.id)
        .eq('event_type', event);

    } else if (event === 'PAYMENT_DELETED') {
      // Remove Asaas sync
      const { data: receivable } = await supabase
        .from('accounts_receivable')
        .select('id')
        .eq('asaas_payment_id', payment.id)
        .single();

      if (receivable) {
        await supabase
          .from('accounts_receivable')
          .update({
            asaas_payment_id: null,
            asaas_status: null,
            sync_with_asaas: false,
          })
          .eq('id', receivable.id);

        console.log('Receivable unsynced from Asaas:', receivable.id);
      }

      await supabase
        .from('asaas_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('payment_id', payment.id)
        .eq('event_type', event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing Asaas webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
