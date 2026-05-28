import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { encryptApiKey } from "../_shared/asaasKey.ts";

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

    const { apiKey, environment: bodyEnv } = await req.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      throw new Error('Informe uma API Key válida');
    }
    const trimmedKey = apiKey.trim();

    // Descobre o ambiente (corpo tem prioridade; senão lê das settings)
    const { data: settings } = await supabase
      .from('asaas_settings')
      .select('id, environment')
      .limit(1)
      .maybeSingle();

    const environment = bodyEnv || settings?.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Valida a chave antes de salvar
    const testResponse = await fetch(`${baseUrl}/myAccount`, {
      headers: { 'access_token': trimmedKey, 'Content-Type': 'application/json' },
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      throw new Error(
        errorData.errors?.[0]?.description ||
        `A chave não foi aceita pelo Asaas (${environment}). Confira a chave e o ambiente.`
      );
    }

    const account = await testResponse.json();

    // Criptografa e salva
    const encrypted = await encryptApiKey(trimmedKey);

    if (settings?.id) {
      const { error } = await supabase
        .from('asaas_settings')
        .update({ api_key_encrypted: encrypted, environment })
        .eq('id', settings.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('asaas_settings')
        .insert({ environment, api_key_encrypted: encrypted });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, accountName: account.name, environment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error saving Asaas key:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
