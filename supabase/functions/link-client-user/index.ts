import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkResponse {
  success: boolean;
  message?: string;
  clientId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';

    // Use service role for DB writes, but forward the Authorization header
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate authenticated user
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' } satisfies LinkResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userRes.user;
    const email = user.email;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: 'User email not available' } satisfies LinkResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find client with matching email (case-insensitive)
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id, user_id, email, created_at')
      .ilike('email', email)
      .order('user_id', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (clientErr) {
      throw clientErr;
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No client found for this email' } satisfies LinkResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prioritize: 1) user_id IS NULL, 2) most recent
    const client = clients[0];

    if (client.user_id === user.id) {
      return new Response(
        JSON.stringify({ success: true, clientId: client.id } satisfies LinkResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Link user to client
    const { error: updateErr } = await supabase
      .from('clients')
      .update({ user_id: user.id })
      .eq('id', client.id);

    if (updateErr) {
      throw updateErr;
    }

    return new Response(
      JSON.stringify({ success: true, clientId: client.id } satisfies LinkResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in link-client-user function:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' } satisfies LinkResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});