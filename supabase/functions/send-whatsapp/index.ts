import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppSettings {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

async function getWhatsAppSettings(supabase: any): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .in("key", ["whatsapp_enabled", "whatsapp_api_url", "whatsapp_api_key", "whatsapp_instance_name"]);

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
    apiUrl: settingsMap.whatsapp_api_url?.replace(/\/$/, ''), // Remove trailing slash
    apiKey: settingsMap.whatsapp_api_key,
    instanceName: settingsMap.whatsapp_instance_name,
  };
}

async function checkInstanceStatus(settings: WhatsAppSettings): Promise<any> {
  try {
    const url = `${settings.apiUrl}/instance/connectionState/${settings.instanceName}`;
    console.log(`Checking status at: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': settings.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Status check failed: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Instance status:", data);
    return data;
  } catch (error: any) {
    console.error("Error checking instance status:", error);
    throw error;
  }
}

async function sendTextMessage(settings: WhatsAppSettings, phone: string, message: string): Promise<any> {
  try {
    // Remove non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Add Brazil country code (55) if not present
    // Brazilian numbers: 10-11 digits (DDD + number)
    // With country code: 12-13 digits (55 + DDD + number)
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
      console.log(`Added country code 55, phone is now: ${cleanPhone}`);
    }
    
    if (cleanPhone.length < 12) {
      throw new Error("Número de telefone inválido. Formato esperado: 55 + DDD + número");
    }

    const url = `${settings.apiUrl}/message/sendText/${settings.instanceName}`;
    console.log(`Sending message to ${cleanPhone} via: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': settings.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Send message failed: ${response.status} - ${errorText}`);
      
      // Check if number doesn't exist on WhatsApp
      if (errorText.includes('"exists":false')) {
        throw new Error(`Número ${cleanPhone} não possui WhatsApp ativo`);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Message sent successfully:", data);
    return data;
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const body = await req.json();
    const { action, phone, message, ticket_id, message_id, event_type } = body;

    console.log(`WhatsApp function called with action: ${action}`);

    // Get WhatsApp settings
    const settings = await getWhatsAppSettings(supabase);
    
    if (!settings) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp integration is not configured or disabled" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required settings
    if (!settings.apiUrl || !settings.apiKey || !settings.instanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp settings are incomplete. Please check API URL, API Key and Instance Name" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle different actions
    switch (action) {
      case 'check_status': {
        const status = await checkInstanceStatus(settings);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: status.state || status.instance?.state || 'unknown',
            data: status
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'send_message': {
        if (!phone || !message) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Phone and message are required" 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await sendTextMessage(settings, phone, message);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: result 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'create_instance': {
        // Create a new instance in Evolution API
        const createInstanceName = body.instance_name || settings.instanceName;
        try {
          const createUrl = `${settings.apiUrl}/instance/create`;
          console.log(`Creating instance at: ${createUrl}`);
          
          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'apikey': settings.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceName: createInstanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            }),
          });

          const createData = await createRes.json();
          console.log("Create instance response:", JSON.stringify(createData));

          return new Response(
            JSON.stringify({ success: true, data: createData }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'get_qr': {
        // Get QR code from Evolution API for the configured instance
        const qrInstanceName = body.instance_name || settings.instanceName;
        try {
          // First try to connect the instance (this generates a new QR)
          const connectUrl = `${settings.apiUrl}/instance/connect/${qrInstanceName}`;
          console.log(`Getting QR from: ${connectUrl}`);
          
          const qrRes = await fetch(connectUrl, {
            method: 'GET',
            headers: {
              'apikey': settings.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!qrRes.ok) {
            const errText = await qrRes.text();
            console.error(`QR fetch failed: ${qrRes.status} - ${errText}`);
            
            // If instance doesn't exist, try creating it first
            if (qrRes.status === 404 || errText.includes('not found') || errText.includes('NOT_FOUND')) {
              console.log("Instance not found, creating...");
              const createUrl = `${settings.apiUrl}/instance/create`;
              const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: {
                  'apikey': settings.apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  instanceName: qrInstanceName,
                  qrcode: true,
                  integration: 'WHATSAPP-BAILEYS',
                }),
              });
              const createData = await createRes.json();
              console.log("Create response:", JSON.stringify(createData));
              
              // The create response may contain the QR code directly
              if (createData?.qrcode?.base64 || createData?.base64) {
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    qrcode: createData.qrcode?.base64 || createData.base64,
                    pairingCode: createData.qrcode?.pairingCode || createData.pairingCode,
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              
              // Try connecting again after creation
              const retryRes = await fetch(connectUrl, {
                method: 'GET',
                headers: { 'apikey': settings.apiKey, 'Content-Type': 'application/json' },
              });
              const retryData = await retryRes.json();
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  qrcode: retryData?.base64 || retryData?.qrcode?.base64 || null,
                  pairingCode: retryData?.pairingCode || retryData?.qrcode?.pairingCode || null,
                  data: retryData,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            throw new Error(`HTTP ${qrRes.status}: ${errText}`);
          }

          const qrData = await qrRes.json();
          console.log("QR response:", JSON.stringify(qrData).substring(0, 200));

          return new Response(
            JSON.stringify({ 
              success: true, 
              qrcode: qrData?.base64 || qrData?.qrcode?.base64 || null,
              pairingCode: qrData?.pairingCode || qrData?.qrcode?.pairingCode || null,
              data: qrData,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err: any) {
          console.error("Error getting QR:", err);
          return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'send_ticket_notification': {
        // Deprecated path – all notifications são disparadas via send-notification
        console.log('Deprecated action send_ticket_notification called; ignoring. Use send-notification.');
        return new Response(
          JSON.stringify({ success: true, message: 'Deprecated action ignored. Use send-notification.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Unknown action: ${action}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    
    // Log more details for Supabase errors
    if (error.code) {
      console.error("Supabase error code:", error.code);
      console.error("Supabase error details:", error.details);
      console.error("Supabase error hint:", error.hint);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        ...(error.code && { code: error.code, details: error.details })
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
