import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getWhatsAppSettings,
  instanceHeaders,
  sendTextMessage,
  type WhatsAppSettings,
} from "../_shared/whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Evolution Go API
// - Admin endpoints (create/delete instance) require the Global API Key
// - Instance endpoints (status/qr/connect/send) require the per-instance token
function adminHeaders(settings: WhatsAppSettings) {
  // Admin operations (create/delete instance) require the Global API Key.
  // Fall back to the instance token if the user only configured one key.
  return {
    'apikey': settings.globalApiKey || settings.instanceToken,
    'Content-Type': 'application/json',
  };
}

// Monta o webhook do bot de tickets para registrar no /instance/connect.
// No Evolution Go o webhook é definido no connect (campos webhookUrl + subscribe),
// NÃO há endpoint separado. Se o bot estiver desabilitado, retorna null e o
// connect não mexe no webhook. O evento de mensagens recebidas é "MESSAGE"
// (nomes de evento são MAIÚSCULOS: ALL, MESSAGE, READ_RECEIPT, ...).
async function getBotWebhook(
  supabase: any,
  supabaseUrl: string,
): Promise<{ webhookUrl: string; subscribe: string[] } | null> {
  const { data } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['whatsapp_bot_enabled', 'whatsapp_webhook_token']);
  const map = (data || []).reduce((acc: any, r: any) => {
    acc[r.key] = r.value;
    return acc;
  }, {} as Record<string, string>);
  if (map.whatsapp_bot_enabled !== 'true' || !map.whatsapp_webhook_token) return null;
  return {
    webhookUrl: `${supabaseUrl}/functions/v1/whatsapp-webhook?token=${map.whatsapp_webhook_token}`,
    subscribe: ['MESSAGE'],
  };
}

// Extrai os flags brutos da Evolution Go: Connected (socket) e LoggedIn (conta pareada).
function extractConnection(payload: any): { connected: boolean; loggedIn: boolean; name: string } {
  const data = payload?.data ?? payload;
  return {
    connected: Boolean(data?.Connected),
    loggedIn: Boolean(data?.LoggedIn),
    name: data?.Name || '',
  };
}

function normalizeStatus(payload: any): string {
  // Evolution Go: { message, data: { Connected, LoggedIn, Name } }
  const data = payload?.data ?? payload;
  if (typeof data?.Connected === 'boolean' || typeof data?.LoggedIn === 'boolean') {
    // Só consideramos "conectado" quando a conta está realmente logada no WhatsApp.
    if (data.LoggedIn) return 'connected';
    // Socket no ar mas sem conta logada => precisa parear (ler QR).
    if (data.Connected) return 'awaiting_qr';
    return 'disconnected';
  }
  // Legacy fallback
  return data?.state || data?.instance?.state || 'unknown';
}

function extractQrCode(payload: any): { qrcode: string | null; pairingCode: string | null } {
  // Evolution Go QR response: { message, data: { Qrcode, Code } }
  const data = payload?.data ?? payload;
  const qrcode = data?.Qrcode || data?.qrcode || data?.base64 || null;
  const pairingCode = data?.Code || data?.pairingCode || null;
  return { qrcode, pairingCode };
}

async function checkInstanceStatus(settings: WhatsAppSettings): Promise<any> {
  const url = `${settings.apiUrl}/instance/status`;
  console.log(`Checking status at: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: instanceHeaders(settings),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Status check failed: ${response.status} - ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Instance status:", data);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, phone, message } = body;

    console.log(`WhatsApp function called with action: ${action}`);

    const settings = await getWhatsAppSettings(supabase);

    if (!settings) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "WhatsApp integration is not configured or disabled",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!settings.apiUrl || !settings.instanceToken || !settings.instanceName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "WhatsApp settings are incomplete. Please check API URL, Instance Token and Instance Name",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    switch (action) {
      case 'check_status': {
        const raw = await checkInstanceStatus(settings);
        const conn = extractConnection(raw);
        return new Response(
          JSON.stringify({
            success: true,
            status: normalizeStatus(raw),
            connected: conn.connected,
            loggedIn: conn.loggedIn,
            name: conn.name,
            data: raw,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'logout': {
        // Tenta encerrar a sessão atual (libera para parear um novo número).
        // Em alguns builds só funciona com cliente ativo; tratamos o erro de forma suave.
        const results: Record<string, string> = {};
        for (const [label, method, path] of [
          ['logout', 'DELETE', '/instance/logout'],
          ['disconnect', 'POST', '/instance/disconnect'],
        ] as const) {
          try {
            const res = await fetch(`${settings.apiUrl}${path}`, {
              method,
              headers: instanceHeaders(settings),
            });
            results[label] = `${res.status}: ${(await res.text()).substring(0, 120)}`;
          } catch (e: any) {
            results[label] = `erro: ${e.message}`;
          }
        }
        console.log('Logout/disconnect results:', JSON.stringify(results));
        return new Response(
          JSON.stringify({ success: true, results }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'register_webhook': {
        // Arma o bot na instância JÁ conectada: registra o webhook via /instance/connect
        // sem precisar reler o QR. Chamado ao ativar/salvar o bot na tela de Integrações.
        const botWebhook = await getBotWebhook(supabase, supabaseUrl);
        if (!botWebhook) {
          return new Response(
            JSON.stringify({ success: true, registered: false, note: 'Bot desabilitado ou sem token de webhook' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        try {
          const res = await fetch(`${settings.apiUrl}/instance/connect`, {
            method: 'POST',
            headers: instanceHeaders(settings),
            body: JSON.stringify({ immediate: true, webhookUrl: botWebhook.webhookUrl, subscribe: botWebhook.subscribe }),
          });
          const data = await res.json().catch(() => ({} as any));
          if (!res.ok) {
            return new Response(
              JSON.stringify({ success: false, error: data?.error || `HTTP ${res.status}` }),
              { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({
              success: true,
              registered: true,
              eventString: data?.data?.eventString ?? null,
              webhookUrl: botWebhook.webhookUrl,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      case 'send_message': {
        if (!phone || !message) {
          return new Response(
            JSON.stringify({ success: false, error: "Phone and message are required" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const result = await sendTextMessage(settings, phone, message);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'create_instance': {
        // Admin operation — requires Global API Key.
        const createInstanceName = body.instance_name || settings.instanceName;
        try {
          const createUrl = `${settings.apiUrl}/instance/create`;
          console.log(`Creating instance at: ${createUrl}`);

          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: adminHeaders(settings),
            body: JSON.stringify({
              name: createInstanceName,
              token: settings.instanceToken,
            }),
          });

          const createData = await createRes.json();
          console.log("Create instance response:", JSON.stringify(createData));

          if (!createRes.ok) {
            const msg = createData?.error || `HTTP ${createRes.status}`;
            // Ignore "already exists" — that's not a real failure for our save flow
            if (typeof msg === 'string' && /already.*exist|duplicate|exists/i.test(msg)) {
              return new Response(
                JSON.stringify({ success: true, data: createData, note: 'Instance already exists' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
              );
            }
            return new Response(
              JSON.stringify({ success: false, error: msg, data: createData }),
              { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }

          return new Response(
            JSON.stringify({ success: true, data: createData }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      case 'get_qr': {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        let connectInfo = '';
        let lastError = '';
        try {
          // 0) Garante que a instância existe (idempotente — ignora "já existe").
          try {
            const createRes = await fetch(`${settings.apiUrl}/instance/create`, {
              method: 'POST',
              headers: adminHeaders(settings),
              body: JSON.stringify({ name: settings.instanceName, token: settings.instanceToken }),
            });
            const createTxt = await createRes.text();
            console.log(`Ensure instance (${createRes.status}): ${createTxt.substring(0, 200)}`);
          } catch (e) {
            console.warn('Ensure instance falhou (seguindo mesmo assim):', e);
          }

          // 1) Dispara o connect — isso inicia a geração do QR (assíncrono).
          //    Aproveitamos para (re)registrar o webhook do bot de tickets: como o
          //    webhook do Evolution Go vive no connect, toda reconexão precisa
          //    reenviá-lo, senão o bot para de receber mensagens.
          const connectUrl = `${settings.apiUrl}/instance/connect`;
          console.log(`Triggering connect at: ${connectUrl}`);
          const botWebhook = await getBotWebhook(supabase, supabaseUrl);
          const connectBody: Record<string, unknown> = { immediate: true };
          if (botWebhook) {
            connectBody.webhookUrl = botWebhook.webhookUrl;
            connectBody.subscribe = botWebhook.subscribe;
          }
          const connectRes = await fetch(connectUrl, {
            method: 'POST',
            headers: instanceHeaders(settings),
            body: JSON.stringify(connectBody),
          });

          if (!connectRes.ok) {
            const errText = await connectRes.text();
            connectInfo = `connect=${connectRes.status}: ${errText}`;
            console.warn(`Connect responded ${connectRes.status}: ${errText}`);
          } else {
            const connectData = await connectRes.json().catch(() => ({}));
            console.log("Connect response:", JSON.stringify(connectData));
          }

          // 2) Busca o QR com algumas tentativas — a Evolution gera de forma assíncrona
          //    e responde "no QR code available. Please wait a moment" se buscarmos cedo.
          const qrUrl = `${settings.apiUrl}/instance/qr`;
          const MAX_ATTEMPTS = 6;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const qrRes = await fetch(qrUrl, { method: 'GET', headers: instanceHeaders(settings) });

            if (qrRes.ok) {
              const qrData = await qrRes.json();
              const { qrcode, pairingCode } = extractQrCode(qrData);
              if (qrcode || pairingCode) {
                console.log(`QR pronto na tentativa ${attempt}`);
                return new Response(
                  JSON.stringify({ success: true, qrcode, pairingCode, data: qrData }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                );
              }
              lastError = 'QR vazio';
            } else {
              const errText = await qrRes.text();
              lastError = `HTTP ${qrRes.status}: ${errText}`;
              console.warn(`QR tentativa ${attempt}: ${lastError}`);

              if (/already|logged|conectad|connected/i.test(errText)) {
                return new Response(
                  JSON.stringify({ success: false, error: 'A instância já parece estar conectada. Verifique o status.' }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                );
              }
            }

            if (attempt < MAX_ATTEMPTS) await sleep(2000);
          }

          // Caso típico: a instância guarda uma sessão antiga e o servidor não
          // consegue reiniciá-la pelas rotas expostas (status fica "client disconnected").
          const stuckSession = /no QR code available|client disconnected/i.test(lastError);
          return new Response(
            JSON.stringify({
              success: false,
              error: stuckSession
                ? 'A sessão desta instância está travada no servidor da Evolution (credencial antiga presa). ' +
                  'Acesse o painel/servidor da Evolution Go e REMOVA/RECRIE a instância "' + settings.instanceName + '" ' +
                  '(ou reinicie o serviço). Depois volte aqui e gere o QR Code novamente.'
                : `Não foi possível obter o QR Code após algumas tentativas. Tente novamente. (${lastError}${connectInfo ? `; ${connectInfo}` : ''})`,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (err: any) {
          console.error("Error getting QR:", err);
          return new Response(
            JSON.stringify({ success: false, error: `${err.message}${connectInfo ? ` [${connectInfo}]` : ''}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      case 'send_ticket_notification': {
        console.log('Deprecated action send_ticket_notification called; ignoring. Use send-notification.');
        return new Response(
          JSON.stringify({ success: true, message: 'Deprecated action ignored. Use send-notification.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }

  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);

    if (error.code) {
      console.error("Supabase error code:", error.code);
      console.error("Supabase error details:", error.details);
      console.error("Supabase error hint:", error.hint);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        ...(error.code && { code: error.code, details: error.details }),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
