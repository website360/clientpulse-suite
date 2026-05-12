import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Evolution Go API
// - Admin endpoints (create/delete instance) require the Global API Key
// - Instance endpoints (status/qr/connect/send) require the per-instance token
interface WhatsAppSettings {
  enabled: boolean;
  apiUrl: string;
  instanceToken: string;
  globalApiKey: string;
  instanceName: string;
}

async function getWhatsAppSettings(supabase: any): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .in("key", [
      "whatsapp_enabled",
      "whatsapp_api_url",
      "whatsapp_api_key",
      "whatsapp_global_api_key",
      "whatsapp_instance_name",
    ]);

  if (error) {
    console.error("Error fetching WhatsApp settings:", error);
    return null;
  }

  const settingsMap = data?.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (!settingsMap?.whatsapp_enabled || settingsMap.whatsapp_enabled !== "true") {
    console.log("WhatsApp integration is disabled");
    return null;
  }

  return {
    enabled: true,
    apiUrl: settingsMap.whatsapp_api_url?.replace(/\/$/, ''),
    instanceToken: settingsMap.whatsapp_api_key, // reused storage key = per-instance token
    globalApiKey: settingsMap.whatsapp_global_api_key || '',
    instanceName: settingsMap.whatsapp_instance_name,
  };
}

function instanceHeaders(settings: WhatsAppSettings) {
  return {
    'apikey': settings.instanceToken,
    'Content-Type': 'application/json',
  };
}

function adminHeaders(settings: WhatsAppSettings) {
  // Admin operations (create/delete instance) require the Global API Key.
  // Fall back to the instance token if the user only configured one key.
  return {
    'apikey': settings.globalApiKey || settings.instanceToken,
    'Content-Type': 'application/json',
  };
}

function normalizeStatus(payload: any): string {
  // Evolution Go: { message, data: { Connected, LoggedIn, Name } }
  const data = payload?.data ?? payload;
  if (typeof data?.Connected === 'boolean' || typeof data?.LoggedIn === 'boolean') {
    if (data.LoggedIn && data.Connected) return 'connected';
    if (data.Connected) return 'connecting';
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

async function sendTextMessage(settings: WhatsAppSettings, phone: string, message: string): Promise<any> {
  let cleanPhone = phone.replace(/\D/g, '');

  // Add Brazil country code (55) for 10-11 digit local numbers
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
    console.log(`Added country code 55, phone is now: ${cleanPhone}`);
  }

  if (cleanPhone.length < 12) {
    throw new Error("Número de telefone inválido. Formato esperado: 55 + DDD + número");
  }

  const url = `${settings.apiUrl}/send/text`;
  console.log(`Sending message to ${cleanPhone} via: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: instanceHeaders(settings),
    body: JSON.stringify({
      number: cleanPhone,
      text: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Send message failed: ${response.status} - ${errorText}`);

    if (errorText.includes('"exists":false') || errorText.toLowerCase().includes('not on whatsapp')) {
      throw new Error(`Número ${cleanPhone} não possui WhatsApp ativo`);
    }

    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Message sent successfully:", data);
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
        return new Response(
          JSON.stringify({
            success: true,
            status: normalizeStatus(raw),
            data: raw,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
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
        try {
          // 1) Ask Evolution Go to (re)connect the instance — this triggers QR generation.
          const connectUrl = `${settings.apiUrl}/instance/connect`;
          console.log(`Triggering connect at: ${connectUrl}`);
          const connectRes = await fetch(connectUrl, {
            method: 'POST',
            headers: instanceHeaders(settings),
            body: JSON.stringify({ immediate: true }),
          });

          if (!connectRes.ok) {
            const errText = await connectRes.text();
            console.warn(`Connect responded ${connectRes.status}: ${errText}`);
            // Continue — the QR endpoint may still work if a session is already pending.
          } else {
            const connectData = await connectRes.json().catch(() => ({}));
            console.log("Connect response:", JSON.stringify(connectData));
          }

          // 2) Fetch the QR code itself.
          const qrUrl = `${settings.apiUrl}/instance/qr`;
          console.log(`Getting QR from: ${qrUrl}`);
          const qrRes = await fetch(qrUrl, {
            method: 'GET',
            headers: instanceHeaders(settings),
          });

          if (!qrRes.ok) {
            const errText = await qrRes.text();
            console.error(`QR fetch failed: ${qrRes.status} - ${errText}`);
            throw new Error(`HTTP ${qrRes.status}: ${errText}`);
          }

          const qrData = await qrRes.json();
          console.log("QR response:", JSON.stringify(qrData).substring(0, 200));

          const { qrcode, pairingCode } = extractQrCode(qrData);

          return new Response(
            JSON.stringify({
              success: true,
              qrcode,
              pairingCode,
              data: qrData,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (err: any) {
          console.error("Error getting QR:", err);
          return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
