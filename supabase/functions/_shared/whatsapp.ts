// Helpers compartilhados para a integração de WhatsApp (Evolution Go).
//
// - getWhatsAppSettings: lê as configurações de integration_settings.
// - normalizePhone: padroniza para somente dígitos com DDI 55 (Brasil).
// - sendTextMessage: envia uma mensagem de texto via Evolution Go.
//
// Usado por: send-whatsapp e whatsapp-webhook.

export interface WhatsAppSettings {
  enabled: boolean;
  apiUrl: string;
  instanceToken: string;
  globalApiKey: string;
  instanceName: string;
}

export async function getWhatsAppSettings(supabase: any): Promise<WhatsAppSettings | null> {
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

export function instanceHeaders(settings: WhatsAppSettings) {
  return {
    'apikey': settings.instanceToken,
    'Content-Type': 'application/json',
  };
}

// Padroniza para somente dígitos com DDI 55 (números locais de 10-11 dígitos).
// Retorna null quando o número é claramente inválido.
export function normalizePhone(phone: string): string | null {
  let cleanPhone = (phone || '').replace(/\D/g, '');

  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }

  if (cleanPhone.length < 12) {
    return null;
  }

  return cleanPhone;
}

export async function sendTextMessage(
  settings: WhatsAppSettings,
  phone: string,
  message: string,
): Promise<any> {
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone) {
    throw new Error("Número de telefone inválido. Formato esperado: 55 + DDD + número");
  }

  const url = `${settings.apiUrl}/send/text`;
  console.log(`Sending message to ${cleanPhone} via: ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: instanceHeaders(settings),
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
      // Quando a instância não está logada, o endpoint trava sem responder.
      // O timeout evita pendurar a função e dá um erro claro.
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    console.error('Send message request failed:', err);
    throw new Error('WhatsApp não está logado/conectado (sem resposta do servidor). Conecte a instância lendo o QR Code e tente novamente.');
  }

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
