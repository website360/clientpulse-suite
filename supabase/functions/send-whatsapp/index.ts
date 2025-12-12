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
