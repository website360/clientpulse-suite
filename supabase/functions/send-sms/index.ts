import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSSettings {
  provider: string;
  account_sid: string;
  auth_token: string;
  from_number: string;
}

interface SMSRequest {
  to: string;
  message: string;
}

async function getSMSSettings(supabase: any): Promise<SMSSettings | null> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['sms_enabled', 'sms_provider', 'sms_account_sid', 'sms_auth_token', 'sms_from_number']);

  if (error) {
    console.error('Error fetching SMS settings:', error);
    return null;
  }

  const settings = data.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (settings.sms_enabled !== 'true') {
    console.log('SMS integration is disabled');
    return null;
  }

  if (!settings.sms_provider || !settings.sms_account_sid || !settings.sms_auth_token || !settings.sms_from_number) {
    console.error('Missing SMS settings');
    return null;
  }

  return {
    provider: settings.sms_provider,
    account_sid: settings.sms_account_sid,
    auth_token: settings.sms_auth_token,
    from_number: settings.sms_from_number,
  };
}

async function sendSMSTwilio(settings: SMSSettings, request: SMSRequest): Promise<any> {
  console.log(`Sending SMS via Twilio to ${request.to}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${settings.account_sid}/Messages.json`;
  
  const auth = btoa(`${settings.account_sid}:${settings.auth_token}`);

  const params = new URLSearchParams({
    To: request.to,
    From: settings.from_number,
    Body: request.message,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Twilio API error:', data);
    throw new Error(data.message || 'Failed to send SMS via Twilio');
  }

  console.log('SMS sent successfully via Twilio:', data);
  return { success: true, data };
}

async function sendSMSZenvia(settings: SMSSettings, request: SMSRequest): Promise<any> {
  console.log(`Sending SMS via Zenvia to ${request.to}`);

  const url = 'https://api.zenvia.com/v2/channels/sms/messages';

  const payload = {
    from: settings.from_number,
    to: request.to,
    contents: [
      {
        type: 'text',
        text: request.message,
      }
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-TOKEN': settings.auth_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Zenvia API error:', data);
    throw new Error(data.message || 'Failed to send SMS via Zenvia');
  }

  console.log('SMS sent successfully via Zenvia:', data);
  return { success: true, data };
}

async function sendSMSTotalVoice(settings: SMSSettings, request: SMSRequest): Promise<any> {
  console.log(`Sending SMS via TotalVoice to ${request.to}`);

  const url = 'https://api.totalvoice.com.br/sms';

  const payload = {
    numero_destino: request.to.replace(/\D/g, ''),
    mensagem: request.message,
    resposta_usuario: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Access-Token': settings.auth_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.sucesso) {
    console.error('TotalVoice API error:', data);
    throw new Error(data.mensagem || 'Failed to send SMS via TotalVoice');
  }

  console.log('SMS sent successfully via TotalVoice:', data);
  return { success: true, data };
}

async function sendSMS(settings: SMSSettings, request: SMSRequest): Promise<any> {
  switch (settings.provider.toLowerCase()) {
    case 'twilio':
      return sendSMSTwilio(settings, request);
    case 'zenvia':
      return sendSMSZenvia(settings, request);
    case 'totalvoice':
      return sendSMSTotalVoice(settings, request);
    default:
      throw new Error(`Unknown SMS provider: ${settings.provider}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { to, message } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = await getSMSSettings(supabaseClient);
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'SMS integration not configured or disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendSMS(settings, { to, message });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
