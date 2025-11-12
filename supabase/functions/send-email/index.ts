import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

async function getEmailSettings(supabase: any): Promise<EmailSettings | null> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('key, value')
    .in('key', ['email_enabled', 'email_smtp_host', 'email_smtp_port', 'email_smtp_user', 'email_smtp_password', 'email_from', 'email_from_name']);

  if (error) {
    console.error('Error fetching email settings:', error);
    return null;
  }

  const settings = data.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (settings.email_enabled !== 'true') {
    console.log('Email integration is disabled');
    return null;
  }

  if (!settings.email_smtp_host || !settings.email_smtp_port || !settings.email_smtp_user || !settings.email_smtp_password || !settings.email_from) {
    console.error('Missing email settings');
    return null;
  }

  return {
    smtp_host: settings.email_smtp_host,
    smtp_port: parseInt(settings.email_smtp_port),
    smtp_user: settings.email_smtp_user,
    smtp_password: settings.email_smtp_password,
    from_email: settings.email_from,
    from_name: settings.email_from_name || 'Sistema',
  };
}

async function sendEmail(settings: EmailSettings, request: EmailRequest): Promise<any> {
  console.log(`Sending email to ${request.to} using port ${settings.smtp_port}`);

  // Conectar ao servidor SMTP com SSL/TLS para porta 465
  const conn = settings.smtp_port === 465
    ? await Deno.connectTls({
        hostname: settings.smtp_host,
        port: settings.smtp_port,
      })
    : await Deno.connect({
        hostname: settings.smtp_host,
        port: settings.smtp_port,
      });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper para ler resposta
  const readResponse = async () => {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) throw new Error('Connection closed');
    return decoder.decode(buffer.subarray(0, n));
  };

  // Helper para enviar comando
  const sendCommand = async (command: string) => {
    console.log('>', command);
    await conn.write(encoder.encode(command + '\r\n'));
    const response = await readResponse();
    console.log('<', response);
    return response;
  };

  try {
    // Banner do servidor
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${settings.smtp_host}`);

    // STARTTLS se necessário (porta 587)
    if (settings.smtp_port === 587) {
      await sendCommand('STARTTLS');
      // Aqui precisaríamos fazer o upgrade para TLS
      // Por simplicidade, vamos usar uma biblioteca externa
    }

    // AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(settings.smtp_user));
    await sendCommand(btoa(settings.smtp_password));

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${settings.from_email}>`);

    // RCPT TO
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    for (const recipient of recipients) {
      await sendCommand(`RCPT TO:<${recipient}>`);
    }

    // DATA
    await sendCommand('DATA');

    // Construir email
    const boundary = `----=_Part_${Date.now()}`;
    const emailContent = [
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${recipients.join(', ')}`,
      `Subject: ${request.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      request.text || request.html?.replace(/<[^>]*>/g, ''),
      ``,
    ];

    if (request.html) {
      emailContent.push(
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        request.html,
        ``
      );
    }

    emailContent.push(`--${boundary}--`);

    await conn.write(encoder.encode(emailContent.join('\r\n') + '\r\n.\r\n'));
    await readResponse();

    // QUIT
    await sendCommand('QUIT');

    conn.close();

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    conn.close();
    throw error;
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

    const { to, subject, html, text } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and html or text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = await getEmailSettings(supabaseClient);
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Email integration not configured or disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendEmail(settings, { to, subject, html, text });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
