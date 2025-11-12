import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramSettings {
  bot_token: string;
  chat_id?: string;
}

interface TelegramRequest {
  chat_id?: string;
  message: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

async function getTelegramSettings(supabase: any): Promise<TelegramSettings | null> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['telegram_enabled', 'telegram_bot_token', 'telegram_chat_id']);

  if (error) {
    console.error('Error fetching telegram settings:', error);
    return null;
  }

  const settings = data.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (settings.telegram_enabled !== 'true') {
    console.log('Telegram integration is disabled');
    return null;
  }

  if (!settings.telegram_bot_token) {
    console.error('Missing telegram bot token');
    return null;
  }

  return {
    bot_token: settings.telegram_bot_token,
    chat_id: settings.telegram_chat_id,
  };
}

async function sendTelegramMessage(settings: TelegramSettings, request: TelegramRequest): Promise<any> {
  const chatId = request.chat_id || settings.chat_id;
  
  if (!chatId) {
    throw new Error('No chat_id provided and no default chat_id configured');
  }

  console.log(`Sending telegram message to chat ${chatId}`);

  const url = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: request.message,
    parse_mode: request.parse_mode || undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error('Telegram API error:', data);
    throw new Error(data.description || 'Failed to send telegram message');
  }

  console.log('Telegram message sent successfully:', data);
  return { success: true, data };
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

    const { chat_id, message, parse_mode } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = await getTelegramSettings(supabaseClient);
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Telegram integration not configured or disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendTelegramMessage(settings, { chat_id, message, parse_mode });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-telegram function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
