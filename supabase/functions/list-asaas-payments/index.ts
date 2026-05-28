import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { getAsaasApiKey } from "../_shared/asaasKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;
const MAX_CUSTOMER_LOOKUPS = 60;

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

    const body = await req.json().catch(() => ({}));
    const dateField: 'dueDate' | 'paymentDate' =
      body.dateField === 'paymentDate' ? 'paymentDate' : 'dueDate';
    const { dateFrom, dateTo, status } = body as {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    };

    // Get Asaas settings
    const { data: settings } = await supabase
      .from('asaas_settings')
      .select('environment')
      .single();

    const environment = settings?.environment || 'sandbox';
    const asaasApiKey = await getAsaasApiKey(supabase);

    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    const asaasHeaders = {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    };

    // Build the base query params (filters are shared across pages)
    const baseParams: Record<string, string> = {};
    if (dateFrom) baseParams[`${dateField}[ge]`] = dateFrom;
    if (dateTo) baseParams[`${dateField}[le]`] = dateTo;
    if (status) baseParams['status'] = status;

    // Paginate through all charges
    const rawPayments: any[] = [];
    let offset = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        ...baseParams,
        limit: String(PAGE_LIMIT),
        offset: String(offset),
      });

      const response = await fetch(`${baseUrl}/payments?${params.toString()}`, {
        headers: asaasHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Asaas API error:', errorData);
        throw new Error(errorData.errors?.[0]?.description || 'Failed to list payments from Asaas');
      }

      const pageData = await response.json();
      const items: any[] = pageData.data || [];
      rawPayments.push(...items);

      if (!pageData.hasMore || items.length === 0) break;
      offset += PAGE_LIMIT;
    }

    // Resolve customer names — local first, then Asaas for the remainder
    const customerIds = [...new Set(rawPayments.map((p) => p.customer).filter(Boolean))];

    const nameById = new Map<string, string>();
    const localClientById = new Map<string, string>();

    if (customerIds.length > 0) {
      const { data: localCustomers } = await supabase
        .from('asaas_customers')
        .select('asaas_customer_id, client_id, client:clients(full_name, company_name)')
        .in('asaas_customer_id', customerIds);

      for (const row of localCustomers || []) {
        const client = (row as any).client;
        if (client) {
          nameById.set(row.asaas_customer_id, client.company_name || client.full_name);
        }
        if (row.client_id) {
          localClientById.set(row.asaas_customer_id, row.client_id);
        }
      }
    }

    // Fetch names for unmapped customers directly from Asaas (capped)
    const unmapped = customerIds.filter((id) => !nameById.has(id)).slice(0, MAX_CUSTOMER_LOOKUPS);
    for (const customerId of unmapped) {
      try {
        const res = await fetch(`${baseUrl}/customers/${customerId}`, { headers: asaasHeaders });
        if (res.ok) {
          const customer = await res.json();
          if (customer?.name) nameById.set(customerId, customer.name);
        }
      } catch (_e) {
        // ignore — name simply stays unresolved
      }
    }

    const charges = rawPayments.map((p) => ({
      id: p.id,
      customerId: p.customer,
      customerName: nameById.get(p.customer) || null,
      localClientId: localClientById.get(p.customer) || null,
      value: p.value,
      dueDate: p.dueDate,
      status: p.status,
      billingType: p.billingType,
      description: p.description,
      externalReference: p.externalReference,
      invoiceUrl: p.invoiceUrl,
      paymentDate: p.paymentDate,
      confirmedDate: p.confirmedDate,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        fetchedAt: new Date().toISOString(),
        charges,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error listing Asaas payments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
