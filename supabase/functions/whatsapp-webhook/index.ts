import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getWhatsAppSettings,
  instanceHeaders,
  normalizePhone,
  sendTextMessage,
} from "../_shared/whatsapp.ts";
import { createTicketFromRequester, type TicketAttachment } from "../_shared/createTicket.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sessão expira após 30 min de inatividade -> recomeça a conversa.
const SESSION_TTL_MS = 30 * 60 * 1000;

// ---------- Parsing do payload de entrada (Evolution Go) ----------
// O formato exato pode variar; tratamos as variações mais comuns e logamos o
// payload cru para ajuste no primeiro teste real.
interface InboundMessage {
  phone: string | null;       // remoteJid -> só dígitos com DDI
  fromMe: boolean;
  isGroup: boolean;
  text: string;
  pushName: string | null;
  image: { base64?: string; url?: string; mimetype?: string; caption?: string } | null;
}

function parseInbound(payload: any): InboundMessage | null {
  // Estruturas possíveis:
  // - evolution-go (event "Message"): data.Info + data.Message (campos CAPITALIZADOS)
  //   ex.: { event:"Message", data:{ Info:{Chat, Sender, IsFromMe, IsGroup, PushName}, Message:{conversation} } }
  // - Evolution API clássica: data.key.remoteJid + data.message (minúsculos)
  const data = payload?.data ?? payload;
  const info = data?.Info ?? data?.info ?? null;      // evolution-go
  const key = data?.key ?? null;                       // Evolution clássica

  // Em DM, Chat = número do contato; em grupo, Chat = jid do grupo.
  const remoteJid: string =
    info?.Chat || info?.Sender ||
    key?.remoteJid || data?.remoteJid || data?.from || data?.chatId || '';
  if (!remoteJid) return null;

  const isGroup =
    Boolean(info?.IsGroup) || remoteJid.includes('@g.us') || remoteJid.includes('@lid');
  const fromMe = Boolean(info?.IsFromMe ?? key?.fromMe ?? data?.fromMe);

  // Remove sufixo de device (":74") e domínio ("@s.whatsapp.net"); mantém só dígitos.
  const jidNumber = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
  const phone = jidNumber ? normalizePhone(jidNumber) : null;

  const msg = data?.Message ?? data?.message ?? data?.msg ?? {};

  const text: string =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.text ||
    data?.text ||
    msg?.imageMessage?.caption ||
    data?.body ||
    '';

  const imageMessage = msg?.imageMessage || msg?.ImageMessage || data?.imageMessage || null;
  let image: InboundMessage['image'] = null;
  if (imageMessage || data?.base64 || msg?.base64) {
    image = {
      base64: data?.base64 || msg?.base64 || imageMessage?.base64 || undefined,
      url: imageMessage?.url || imageMessage?.URL || imageMessage?.directPath || undefined,
      mimetype: imageMessage?.mimetype || imageMessage?.mimeType || 'image/jpeg',
      caption: imageMessage?.caption || imageMessage?.Caption || undefined,
    };
  }

  const pushName: string | null =
    info?.PushName || data?.pushName || data?.pushname || data?.notifyName || null;

  return { phone, fromMe, isGroup, text: (text || '').trim(), pushName, image };
}

// Tenta obter os bytes da imagem como base64 (sem prefixo data:).
async function resolveImageBase64(
  settings: any,
  image: NonNullable<InboundMessage['image']>,
): Promise<string | null> {
  if (image.base64) {
    return image.base64.includes('base64,') ? image.base64.split('base64,')[1] : image.base64;
  }
  if (image.url) {
    try {
      const res = await fetch(image.url, { headers: instanceHeaders(settings) });
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        let binary = '';
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        return btoa(binary);
      }
    } catch (err) {
      console.error('Falha ao baixar imagem da URL:', err);
    }
  }
  return null;
}

// ---------- Textos do bot ----------
const STEP = {
  ASK_NAME: 'awaiting_name',
  ASK_DEPARTMENT: 'awaiting_department',
  ASK_SUBJECT: 'awaiting_subject',
  ASK_DESCRIPTION: 'awaiting_description',
  ASK_PHOTO_DECISION: 'awaiting_photo_decision',
  ASK_PHOTO: 'awaiting_photo',
} as const;

const RESET_WORDS = ['oi', 'olá', 'ola', 'menu', 'início', 'inicio', 'começar', 'comecar', 'cancelar'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Valida token do webhook (query string ou header).
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('x-webhook-token');
    const rawBody = await req.text().catch(() => '');

    const { data: tokenSetting } = await supabase
      .from('integration_settings')
      .select('value')
      .eq('key', 'whatsapp_webhook_token')
      .maybeSingle();

    if (tokenSetting?.value && token !== tokenSetting.value) {
      console.error('Webhook token inválido');
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Bot precisa estar habilitado.
    const { data: botSetting } = await supabase
      .from('integration_settings')
      .select('value')
      .eq('key', 'whatsapp_bot_enabled')
      .maybeSingle();
    if (botSetting?.value !== 'true') {
      console.log('Bot desabilitado; ignorando webhook.');
      return new Response(JSON.stringify({ ok: true, ignored: 'bot_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = {}; }
    console.log('WhatsApp webhook payload:', JSON.stringify(payload).substring(0, 1500));

    const inbound = parseInbound(payload);

    // Ignora: sem telefone, mensagem própria, grupos.
    if (!inbound || !inbound.phone || inbound.fromMe || inbound.isGroup) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = await getWhatsAppSettings(supabase);
    if (!settings) {
      console.error('WhatsApp não configurado; não é possível responder.');
      return new Response(JSON.stringify({ ok: true, ignored: 'whatsapp_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const phone = inbound.phone;
    const reply = (message: string) => sendTextMessage(settings, phone, message);

    // 3) Carrega sessão (e descarta se expirada).
    const { data: existing } = await supabase
      .from('whatsapp_bot_sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    let session = existing;
    if (session) {
      const age = Date.now() - new Date(session.updated_at).getTime();
      if (age > SESSION_TTL_MS) session = null;
    }

    const textLower = inbound.text.toLowerCase();
    const isReset = RESET_WORDS.includes(textLower);

    // Helpers de persistência da sessão.
    const saveSession = async (step: string, data: any) => {
      await supabase
        .from('whatsapp_bot_sessions')
        .upsert({ phone, step, data, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
    };
    const clearSession = async () => {
      await supabase.from('whatsapp_bot_sessions').delete().eq('phone', phone);
    };

    // Lista departamentos ativos para o menu.
    const loadDepartments = async () => {
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return depts || [];
    };
    const departmentMenu = (depts: any[]) =>
      depts.map((d, i) => `${i + 1}. ${d.name}`).join('\n');

    // ---------- Início / reset ----------
    if (!session || isReset) {
      // Tenta identificar o cliente pelo telefone para personalizar a saudação.
      const tail = phone.slice(-8);
      const { data: clientsWithPhone } = await supabase
        .from('clients')
        .select('company_name, responsible_name, full_name, phone')
        .not('phone', 'is', null);
      const matched = (clientsWithPhone || []).find(
        (c: any) => (c.phone || '').replace(/\D/g, '').endsWith(tail),
      );
      const knownName = matched
        ? matched.company_name || matched.responsible_name || matched.full_name
        : null;

      const depts = await loadDepartments();
      if (depts.length === 0) {
        await reply('Olá! No momento não há setores disponíveis para atendimento. Tente novamente mais tarde.');
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (knownName) {
        await saveSession(STEP.ASK_DEPARTMENT, { name: knownName, attachments: [] });
        await reply(
          `Olá, ${knownName}! 👋 Sou o assistente de atendimento da Agência May.\n\n` +
            `Para qual setor é o seu atendimento? Responda com o número:\n\n${departmentMenu(depts)}`,
        );
      } else {
        await saveSession(STEP.ASK_NAME, { attachments: [] });
        await reply(
          'Olá! 👋 Sou o assistente de atendimento da Agência May. Vou te ajudar a abrir um chamado.\n\n' +
            'Para começar, qual é o seu nome?',
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = session.data || {};

    switch (session.step) {
      case STEP.ASK_NAME: {
        if (!inbound.text) {
          await reply('Por favor, me diga o seu nome para continuarmos.');
          break;
        }
        data.name = inbound.text;
        const depts = await loadDepartments();
        data._departments = depts.map((d: any) => d.id);
        await saveSession(STEP.ASK_DEPARTMENT, data);
        await reply(
          `Prazer, ${data.name}! Para qual setor é o seu atendimento? Responda com o número:\n\n${departmentMenu(depts)}`,
        );
        break;
      }

      case STEP.ASK_DEPARTMENT: {
        const depts = await loadDepartments();
        const choice = parseInt(inbound.text.replace(/\D/g, ''), 10);
        if (!choice || choice < 1 || choice > depts.length) {
          await reply(`Não entendi. Responda com o número do setor:\n\n${departmentMenu(depts)}`);
          break;
        }
        data.department_id = depts[choice - 1].id;
        data.department_name = depts[choice - 1].name;
        await saveSession(STEP.ASK_SUBJECT, data);
        await reply('Perfeito! Em poucas palavras, qual é o *assunto* do seu chamado?');
        break;
      }

      case STEP.ASK_SUBJECT: {
        if (!inbound.text) {
          await reply('Por favor, escreva o assunto do chamado.');
          break;
        }
        data.subject = inbound.text;
        await saveSession(STEP.ASK_DESCRIPTION, data);
        await reply('Entendi. Agora *descreva o problema* com mais detalhes, por favor.');
        break;
      }

      case STEP.ASK_DESCRIPTION: {
        if (!inbound.text) {
          await reply('Por favor, descreva o problema para continuarmos.');
          break;
        }
        data.description = inbound.text;
        await saveSession(STEP.ASK_PHOTO_DECISION, data);
        await reply('Quer enviar uma *foto* para ilustrar o problema?\n\n1. Sim\n2. Não');
        break;
      }

      case STEP.ASK_PHOTO_DECISION: {
        const choice = inbound.text.replace(/\D/g, '');
        const saidYes = choice === '1' || /^sim/i.test(textLower);
        const saidNo = choice === '2' || /^n[ãa]o/i.test(textLower);
        if (saidYes) {
          await saveSession(STEP.ASK_PHOTO, data);
          await reply('Pode enviar a foto. Quando terminar (ou se mudar de ideia), digite *finalizar*.');
        } else if (saidNo) {
          await finalize(supabase, supabaseUrl, phone, data, reply, clearSession);
        } else {
          await reply('Não entendi. Responda:\n\n1. Sim\n2. Não');
        }
        break;
      }

      case STEP.ASK_PHOTO: {
        if (inbound.image) {
          const base64 = await resolveImageBase64(settings, inbound.image);
          if (base64) {
            data.attachments = data.attachments || [];
            const ext = (inbound.image.mimetype || 'image/jpeg').split('/')[1] || 'jpg';
            data.attachments.push({
              name: `whatsapp-${data.attachments.length + 1}.${ext}`,
              type: inbound.image.mimetype || 'image/jpeg',
              size: Math.floor((base64.length * 3) / 4),
              data: base64,
            });
            await saveSession(STEP.ASK_PHOTO, data);
            await reply('Foto recebida! ✅ Pode enviar outra ou digite *finalizar* para concluir.');
          } else {
            await reply('Não consegui processar essa imagem. Tente enviar novamente ou digite *finalizar*.');
          }
          break;
        }
        if (/finalizar|concluir|pronto|terminei/i.test(textLower)) {
          await finalize(supabase, supabaseUrl, phone, data, reply, clearSession);
        } else {
          await reply('Envie a foto como imagem, ou digite *finalizar* para concluir o chamado.');
        }
        break;
      }

      default: {
        // Estado desconhecido: reinicia.
        await clearSession();
        await reply('Vamos recomeçar. Digite *oi* para abrir um novo chamado.');
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro no whatsapp-webhook:', error);
    // Sempre 200 para o Evolution não ficar reenviando indefinidamente.
    return new Response(JSON.stringify({ ok: false, error: (error as Error)?.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Cria o ticket e responde ao cliente com o número de protocolo.
async function finalize(
  supabase: any,
  supabaseUrl: string,
  phone: string,
  data: any,
  reply: (m: string) => Promise<any>,
  clearSession: () => Promise<any>,
) {
  if (!data.department_id || !data.subject || !data.description) {
    await reply('Faltam informações para abrir o chamado. Digite *oi* para recomeçar.');
    await clearSession();
    return;
  }

  try {
    const result = await createTicketFromRequester(supabase, supabaseUrl, {
      name: data.name || 'Cliente WhatsApp',
      phone,
      department_id: data.department_id,
      subject: data.subject,
      description: data.description,
      attachments: (data.attachments || []) as TicketAttachment[],
      source: 'whatsapp',
    });

    await reply(
      `✅ Chamado aberto com sucesso!\n\n` +
        `*Protocolo: #${result.ticket_number}*\n` +
        `Assunto: ${data.subject}\n\n` +
        `Nossa equipe vai analisar e em breve você recebe um retorno. Guarde o número do protocolo. 🙌`,
    );
  } catch (err) {
    console.error('Erro ao criar ticket pelo bot:', err);
    await reply('Tivemos um problema ao registrar seu chamado. Por favor, tente novamente em instantes digitando *oi*.');
  } finally {
    await clearSession();
  }
}
