import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting expiring items check...');

    // Check expiring contracts
    const { error: contractsError } = await supabase.rpc('check_expiring_contracts');
    
    if (contractsError) {
      console.error('Error checking expiring contracts:', contractsError);
      throw contractsError;
    }

    console.log('Contracts check completed');

    // Check expiring domains
    const { error: domainsError } = await supabase.rpc('check_expiring_domains');
    
    if (domainsError) {
      console.error('Error checking expiring domains:', domainsError);
      throw domainsError;
    }

    console.log('Domains check completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Expiring items check completed successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in check-expiring-items function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
