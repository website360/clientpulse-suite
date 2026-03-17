import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Raw IMAP client using Deno TLS
class SimpleIMAP {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;
  private buffer = '';

  async connect(host: string, port: number) {
    this.conn = await Deno.connectTls({ hostname: host, port });
    await this.readResponse(); // server greeting
  }

  private nextTag(): string {
    return `A${String(++this.tagCounter).padStart(4, '0')}`;
  }

  private async readResponse(): Promise<string> {
    const buf = new Uint8Array(8192);
    let result = '';
    // Read until we get a complete response
    while (true) {
      const n = await this.conn!.read(buf);
      if (n === null) break;
      result += this.decoder.decode(buf.subarray(0, n));
      // Check if response is complete (tagged response or continuation)
      if (/^(A\d{4}|\*) /m.test(result) && result.endsWith('\r\n')) break;
      // Safety: don't read forever
      if (result.length > 100000) break;
    }
    return result;
  }

  private async command(cmd: string): Promise<string> {
    const tag = this.nextTag();
    const fullCmd = `${tag} ${cmd}\r\n`;
    await this.conn!.write(this.encoder.encode(fullCmd));
    
    let result = '';
    const buf = new Uint8Array(16384);
    while (true) {
      const n = await this.conn!.read(buf);
      if (n === null) break;
      result += this.decoder.decode(buf.subarray(0, n));
      if (result.includes(`${tag} OK`) || result.includes(`${tag} NO`) || result.includes(`${tag} BAD`)) break;
      if (result.length > 500000) break;
    }
    
    if (result.includes(`${tag} NO`) || result.includes(`${tag} BAD`)) {
      throw new Error(`IMAP error: ${result.trim()}`);
    }
    
    return result;
  }

  async login(user: string, pass: string) {
    // Escape quotes in password
    const escapedPass = pass.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return await this.command(`LOGIN "${user}" "${escapedPass}"`);
  }

  async selectInbox(): Promise<number> {
    const res = await this.command('SELECT INBOX');
    const match = res.match(/\* (\d+) EXISTS/);
    return match ? parseInt(match[1]) : 0;
  }

  async fetchRecentWithBody(count: number = 15): Promise<any[]> {
    const totalRes = await this.command('SELECT INBOX');
    const existsMatch = totalRes.match(/\* (\d+) EXISTS/);
    const total = existsMatch ? parseInt(existsMatch[1]) : 0;
    
    if (total === 0) return [];
    
    const start = Math.max(1, total - count + 1);
    const messages: any[] = [];

    // Fetch each message individually to get full body
    for (let seq = start; seq <= total; seq++) {
      try {
        // Fetch envelope + full body
        const res = await this.command(`FETCH ${seq} (UID ENVELOPE BODY[])`);
        
        // Extract UID
        const uidMatch = res.match(/UID (\d+)/);
        const uid = uidMatch ? parseInt(uidMatch[1]) : seq;
        
        // Extract ENVELOPE
        const envMatch = res.match(/ENVELOPE \((.+?)\)\s*(?:BODY|$)/s);
        const envStr = envMatch ? envMatch[1] : '';
        
        // Parse date - first quoted string
        const dateMatch = envStr.match(/"([^"]+)"/);
        const date = dateMatch ? dateMatch[1] : '';
        
        // Parse subject - second quoted string
        const parts = envStr.match(/"([^"]*)"/g) || [];
        const subject = parts.length > 1 ? parts[1].replace(/"/g, '') : '(Sem Assunto)';
        
        // Parse from
        const fromMatch = envStr.match(/\(\("?([^"]*)"?\s+NIL\s+"([^"]+)"\s+"([^"]+)"\)\)/);
        let senderName = 'Unknown';
        let senderEmail = '';
        if (fromMatch) {
          senderName = fromMatch[1] || fromMatch[2];
          senderEmail = `${fromMatch[2]}@${fromMatch[3]}`;
        }

        // Extract full body - look for the literal string after {size}
        let bodyContent = '';
        let htmlContent = '';
        const bodyLiteral = res.match(/BODY\[\]\s*\{(\d+)\}\r\n([\s\S]*)/);
        if (bodyLiteral) {
          const fullBody = bodyLiteral[2];
          
          // Try to extract HTML part
          const htmlMatch = fullBody.match(/Content-Type:\s*text\/html[^]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\)\s*$)/i);
          if (htmlMatch) {
            htmlContent = htmlMatch[1].trim();
          }
          
          // Try to extract plain text part
          const textMatch = fullBody.match(/Content-Type:\s*text\/plain[^]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\)\s*$)/i);
          if (textMatch) {
            bodyContent = textMatch[1].trim();
          }
          
          // If no multipart, try the whole body after headers
          if (!htmlContent && !bodyContent) {
            const simpleBody = fullBody.match(/\r\n\r\n([\s\S]*?)(?:\r\n\)\s*$)/);
            if (simpleBody) {
              bodyContent = simpleBody[1].trim();
              // Check if it looks like HTML
              if (bodyContent.includes('<html') || bodyContent.includes('<div') || bodyContent.includes('<p')) {
                htmlContent = bodyContent;
                bodyContent = bodyContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              }
            }
          }
        }

        // Decode base64 content if needed
        if (htmlContent && /^[A-Za-z0-9+/=\s]+$/.test(htmlContent.replace(/\s/g, ''))) {
          try { htmlContent = atob(htmlContent.replace(/\s/g, '')); } catch {}
        }
        if (bodyContent && /^[A-Za-z0-9+/=\s]+$/.test(bodyContent.replace(/\s/g, ''))) {
          try { bodyContent = atob(bodyContent.replace(/\s/g, '')); } catch {}
        }

        // Decode quoted-printable
        const decodeQP = (s: string) => s.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/=\r?\n/g, '');
        if (htmlContent.includes('=3D') || htmlContent.includes('=20')) htmlContent = decodeQP(htmlContent);
        if (bodyContent.includes('=3D') || bodyContent.includes('=20')) bodyContent = decodeQP(bodyContent);

        // Limit sizes
        htmlContent = htmlContent.substring(0, 50000);
        bodyContent = bodyContent.substring(0, 10000);
        
        const preview = bodyContent 
          ? bodyContent.substring(0, 200) 
          : (htmlContent ? htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 200) : subject);
        
        messages.push({ uid, seq, date, subject, senderName, senderEmail, bodyContent, htmlContent, preview });
      } catch (err) {
        console.log(`Error fetching message ${seq}:`, err);
      }
    }
    
    return messages;
  }

  async logout() {
    try {
      await this.command('LOGOUT');
    } catch { /* ignore */ }
    try {
      this.conn?.close();
    } catch { /* ignore */ }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { accountId, password, email, imapServer, imapPort } = await req.json();

    if (!email || !imapServer || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetros obrigatórios: email, imapServer, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const port = imapPort || 993;
    console.log(`Connecting to ${imapServer}:${port} as ${email}`);

    // Connect to IMAP
    const imap = new SimpleIMAP();
    await imap.connect(imapServer, port);
    await imap.login(email, password);

    // Fetch recent messages with full body
    const rawMessages = await imap.fetchRecentWithBody(15);
    console.log(`Found ${rawMessages.length} messages`);

    // Build messages for DB
    const messages = rawMessages.map((msg: any) => ({
      account_id: accountId,
      conversation_id: `${email}-${msg.uid}`,
      sender_name: msg.senderName || 'Unknown',
      sender_email: msg.senderEmail || '',
      subject: msg.subject || '(Sem Assunto)',
      content: msg.bodyContent || msg.preview || msg.subject || '(Sem conteúdo)',
      html_content: msg.htmlContent || null,
      direction: 'inbound',
      message_type: 'email',
      external_id: String(msg.uid),
      is_read: false,
      metadata: { date: msg.date, preview: msg.preview },
    }));

    await imap.logout();

    // Insert messages (check for duplicates first)
    let insertedCount = 0;
    if (messages.length > 0) {
      for (const msg of messages) {
        // Check if message already exists
        const { data: existing } = await supabaseClient
          .from('messages')
          .select('id')
          .eq('external_id', msg.external_id)
          .maybeSingle();

        if (existing) {
          console.log(`Skipping duplicate: ${msg.external_id}`);
          continue;
        }

        const { error: insertError } = await supabaseClient
          .from('messages')
          .insert(msg);

        if (!insertError) insertedCount++;
        else console.log('Insert error:', insertError.message);
      }
    }

    // Update sync status
    const maxUid = rawMessages.length > 0 ? Math.max(...rawMessages.map((m: any) => m.uid)) : 0;
    await supabaseClient
      .from('email_sync_status')
      .upsert({
        account_id: accountId,
        last_sync_at: new Date().toISOString(),
        last_uid: maxUid,
        sync_status: 'idle',
      });

    return new Response(
      JSON.stringify({ success: true, messagesCount: insertedCount, totalFound: rawMessages.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
