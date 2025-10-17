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
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { document_id, amount, due_date, billing_type, description } = await req.json();

    if (!document_id || !amount || !due_date) {
      throw new Error('document_id, amount e due_date são obrigatórios');
    }

    // Buscar configurações do Asaas
    const { data: settings, error: settingsError } = await supabase
      .from('asaas_settings')
      .select('*')
      .single();

    if (settingsError || !settings || !settings.is_active) {
      throw new Error('Asaas não está configurado ou ativo');
    }

    // Buscar documento gerado
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*, clients(*)')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Documento não encontrado');
    }

    // Determinar URL base do Asaas
    const baseUrl = settings.environment === 'production'
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Buscar ou criar customer no Asaas
    let asaasCustomerId = null;
    const { data: existingCustomer } = await supabase
      .from('asaas_customers')
      .select('asaas_customer_id')
      .eq('client_id', document.client_id)
      .single();

    if (existingCustomer) {
      asaasCustomerId = existingCustomer.asaas_customer_id;
    } else {
      // Criar customer no Asaas
      const customerResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: document.clients.full_name || document.clients.company_name,
          email: document.clients.email,
          phone: document.clients.phone,
          mobilePhone: document.clients.phone,
          cpfCnpj: document.clients.cpf_cnpj,
          postalCode: document.clients.address_cep,
          address: document.clients.address_street,
          addressNumber: document.clients.address_number,
          complement: document.clients.address_complement,
          province: document.clients.address_neighborhood,
          notificationDisabled: false,
        }),
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.text();
        throw new Error(`Erro ao criar customer no Asaas: ${errorData}`);
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;

      // Salvar customer no banco
      await supabase.from('asaas_customers').insert({
        client_id: document.client_id,
        asaas_customer_id: asaasCustomerId,
      });
    }

    // Criar cobrança no Asaas
    const paymentResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billing_type || settings.default_billing_type || 'BOLETO',
        value: amount,
        dueDate: due_date,
        description: description || document.document_name,
        externalReference: document_id,
        postalService: false,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      throw new Error(`Erro ao criar cobrança no Asaas: ${errorData}`);
    }

    const paymentData = await paymentResponse.json();

    // Atualizar documento com informações do pagamento
    const { error: updateError } = await supabase
      .from('generated_documents')
      .update({
        asaas_payment_id: paymentData.id,
        payment_status: paymentData.status,
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Error updating document:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentData.id,
        invoice_url: paymentData.invoiceUrl,
        bank_slip_url: paymentData.bankSlipUrl,
        pix_qr_code: paymentData.qrCode,
        message: 'Cobrança criada com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
