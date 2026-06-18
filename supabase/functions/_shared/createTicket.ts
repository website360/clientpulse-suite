// Criação reutilizável de ticket a partir de um "solicitante" (com ou sem login).
//
// Usado por:
// - create-public-ticket (página pública de abertura de tickets)
// - whatsapp-webhook (bot de abertura via WhatsApp)
//
// Faz match de cliente por e-mail e por telefone; quando não encontra, grava
// os dados do solicitante direto no ticket (requester_name/email/phone).

export interface TicketAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 (com ou sem prefixo data:)
}

export interface CreateTicketInput {
  name: string;
  email?: string | null;
  phone: string;
  department_id: string;
  priority?: string;
  subject: string;
  description: string;
  attachments?: TicketAttachment[];
  source?: string; // ex.: 'public' | 'whatsapp' (apenas para logs)
}

export interface CreateTicketResult {
  ticket_id: string;
  ticket_number: number;
  client_found: boolean;
  attachments_uploaded: number;
}

// Mantém apenas os dígitos significativos do telefone para comparação.
function phoneDigits(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '');
}

export async function createTicketFromRequester(
  supabase: any,
  supabaseUrl: string,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  const { name, email, phone, department_id, priority, subject, description, attachments } = input;

  // 1) Tenta achar um cliente existente: primeiro por e-mail, depois por telefone.
  let clientId: string | null = null;

  if (email) {
    const { data: clientByEmail } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (clientByEmail) {
      clientId = clientByEmail.id;
    } else {
      const { data: contactByEmail } = await supabase
        .from('client_contacts')
        .select('client_id')
        .ilike('email', email)
        .maybeSingle();
      if (contactByEmail) clientId = contactByEmail.client_id;
    }
  }

  // Match por telefone (compara apenas os últimos dígitos, ignorando DDI/formatação).
  if (!clientId && phone) {
    const digits = phoneDigits(phone);
    const tail = digits.slice(-8); // últimos 8 dígitos = número local sem DDD inicial
    if (tail) {
      const { data: clientsWithPhone } = await supabase
        .from('clients')
        .select('id, phone')
        .not('phone', 'is', null);
      const match = (clientsWithPhone || []).find(
        (c: any) => phoneDigits(c.phone).endsWith(tail),
      );
      if (match) clientId = match.id;
    }
  }

  // 2) Gera o número sequencial do ticket.
  const { data: lastTicket } = await supabase
    .from('tickets')
    .select('ticket_number')
    .order('ticket_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextTicketNumber = (lastTicket?.ticket_number || 0) + 1;

  // 3) Cria o ticket.
  const ticketData: any = {
    ticket_number: nextTicketNumber,
    department_id,
    priority: priority || 'medium',
    subject,
    description,
    status: 'waiting',
  };

  if (clientId) {
    ticketData.client_id = clientId;
    ticketData.requester_name = null;
    ticketData.requester_email = null;
    ticketData.requester_phone = null;
  } else {
    ticketData.client_id = null;
    ticketData.requester_name = name;
    ticketData.requester_email = email || null;
    ticketData.requester_phone = phone;
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert(ticketData)
    .select('id, ticket_number')
    .single();

  if (ticketError) {
    throw new Error('Erro ao criar ticket: ' + ticketError.message);
  }

  // 4) Sobe anexos (se houver) para o bucket ticket-attachments.
  let attachmentsUploaded = 0;
  if (attachments && attachments.length > 0) {
    const uploaded: { name: string; path: string; type: string; size: number }[] = [];

    for (const attachment of attachments) {
      try {
        const base64Data = attachment.data.includes('base64,')
          ? attachment.data.split('base64,')[1]
          : attachment.data;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const fileExt = attachment.name.split('.').pop() || 'bin';
        const fileName = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, bytes, { contentType: attachment.type, upsert: false });

        if (uploadError) {
          console.error('Error uploading attachment:', uploadError);
        } else {
          uploaded.push({ name: attachment.name, path: fileName, type: attachment.type, size: attachment.size });
        }
      } catch (uploadErr) {
        console.error('Error processing attachment:', uploadErr);
      }
    }

    if (uploaded.length > 0) {
      const attachmentRecords = uploaded.map((att) => ({
        ticket_id: ticket.id,
        file_name: att.name,
        file_url: att.path,
        file_type: att.type,
        file_size: att.size,
      }));
      const { error: attachmentInsertError } = await supabase
        .from('ticket_attachments')
        .insert(attachmentRecords);
      if (attachmentInsertError) {
        console.error('Error saving attachments to database:', attachmentInsertError);
      } else {
        attachmentsUploaded = uploaded.length;
      }
    }
  }

  // 5) Notifica os admins.
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin: any) => ({
      user_id: admin.user_id,
      title: `Novo ticket #${ticket.ticket_number}`,
      description: `${clientId ? 'Cliente identificado' : 'Solicitante: ' + name} - ${subject}`,
      type: 'info',
      reference_type: 'ticket',
      reference_id: ticket.id,
    }));
    await supabase.from('notifications').insert(notifications);
  }

  // 6) Dispara notificação multi-canal (e-mail/WhatsApp/etc.).
  try {
    let departmentName = 'Não especificado';
    const { data: deptData } = await supabase
      .from('departments')
      .select('name')
      .eq('id', department_id)
      .single();
    if (deptData) departmentName = deptData.name;

    let clientName = name;
    let clientEmail = email || '';
    let clientPhone = phone;

    if (clientId) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('company_name, responsible_name, full_name, email, phone')
        .eq('id', clientId)
        .single();
      if (clientData) {
        clientName = clientData.company_name || clientData.responsible_name || clientData.full_name || name;
        clientEmail = clientData.email || clientEmail;
        clientPhone = clientData.phone || clientPhone;
      }
    }

    const ticketUrl = `${supabaseUrl}/tickets/${ticket.id}`;

    await supabase.functions.invoke('send-notification', {
      body: {
        event_type: 'ticket_created',
        reference_type: 'ticket',
        reference_id: ticket.id,
        data: {
          ticket_number: ticket.ticket_number,
          subject,
          description,
          priority: priority || 'medium',
          department: departmentName,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          requester_name: name,
          requester_email: email || '',
          requester_phone: phone,
          ticket_url: ticketUrl,
          created_at: new Date().toLocaleString('pt-BR'),
        },
      },
    });
  } catch (notifError) {
    console.error('Error invoking send-notification:', notifError);
    // Não falha a criação do ticket se a notificação falhar.
  }

  return {
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    client_found: !!clientId,
    attachments_uploaded: attachmentsUploaded,
  };
}
