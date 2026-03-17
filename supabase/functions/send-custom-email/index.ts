import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { accountId, fromEmail, fromName, to, subject, text, html, smtpServer, smtpPort, password } = await req.json();

    if (!to || !subject || !smtpServer || !fromEmail || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios: to, subject, smtpServer, fromEmail, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const port = smtpPort || 465;
    console.log(`Sending email via ${smtpServer}:${port} from ${fromEmail} to ${to}`);

    // Connect to SMTP with TLS
    const conn = port === 465
      ? await Deno.connectTls({ hostname: smtpServer, port })
      : await Deno.connect({ hostname: smtpServer, port });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) throw new Error('Connection closed');
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (command: string) => {
      await conn.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    // SMTP conversation
    await readResponse(); // banner
    await sendCommand(`EHLO ${smtpServer}`);
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(fromEmail));
    const authRes = await sendCommand(btoa(password));
    
    if (authRes.includes('535') || authRes.includes('534')) {
      conn.close();
      throw new Error('Autenticação SMTP falhou. Verifique email e senha.');
    }

    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    
    const recipients = Array.isArray(to) ? to : [to];
    for (const r of recipients) {
      await sendCommand(`RCPT TO:<${r}>`);
    }

    await sendCommand('DATA');

    // Encode non-ASCII headers
    const encodeHeader = (t: string): string => {
      if (/[^\x00-\x7F]/.test(t)) {
        return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(t)))}?=`;
      }
      return t;
    };

    const body = text || html?.replace(/<[^>]*>/g, '') || '';
    const emailContent = [
      `From: ${encodeHeader(fromName || fromEmail)} <${fromEmail}>`,
      `To: ${recipients.join(', ')}`,
      `Subject: ${encodeHeader(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      body,
    ].join('\r\n');

    await conn.write(encoder.encode(emailContent + '\r\n.\r\n'));
    await readResponse();
    await sendCommand('QUIT');
    conn.close();

    // Save sent message to database
    if (accountId) {
      await supabaseClient.from('messages').insert({
        account_id: accountId,
        conversation_id: `${fromEmail}-${Date.now()}`,
        sender_name: fromName || fromEmail,
        sender_email: fromEmail,
        subject: subject,
        content: body,
        direction: 'outbound',
        message_type: 'email',
        external_id: `sent-${Date.now()}`,
        is_read: true,
        metadata: { to: recipients },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
