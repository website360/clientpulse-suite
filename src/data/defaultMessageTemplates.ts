// Templates de mensagens padrão baseados no WHMCS
export const DEFAULT_MESSAGE_TEMPLATES = {
  ticket_opened: {
    name: 'Ticket Aberto',
    category: 'ticket_opened',
    email_subject: 'Ticket #{ticket_number} - {ticket_subject}',
    email_html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .label { font-weight: bold; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Novo Ticket Aberto</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #{ticket_number}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{client_name}</strong>,</p>
      <p>Seu ticket foi aberto com sucesso e nossa equipe já foi notificada.</p>
      
      <div class="ticket-info">
        <p><span class="label">Número do Ticket:</span> #{ticket_number}</p>
        <p><span class="label">Assunto:</span> {ticket_subject}</p>
        <p><span class="label">Departamento:</span> {department_name}</p>
        <p><span class="label">Prioridade:</span> {ticket_priority}</p>
        <p><span class="label">Status:</span> {ticket_status}</p>
      </div>

      <p><span class="label">Sua mensagem:</span></p>
      <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
        {ticket_message}
      </div>

      <center>
        <a href="{ticket_url}" class="button">Ver Ticket</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Você receberá atualizações por email sempre que houver uma resposta.
      </p>
    </div>
    <div class="footer">
      <p>© {company_name} - Todos os direitos reservados</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
    `,
    whatsapp_template: `🎫 *Novo Ticket Aberto*

Olá *{client_name}*!

Seu ticket foi aberto com sucesso:

📋 *Detalhes:*
• Número: #{ticket_number}
• Assunto: {ticket_subject}
• Departamento: {department_name}
• Prioridade: {ticket_priority}
• Status: {ticket_status}

Nossa equipe já foi notificada e responderá em breve.

Você pode acompanhar o andamento pelo link:
{ticket_url}

_Atenciosamente,_
*{company_name}*`,
  },
  
  ticket_reply: {
    name: 'Resposta ao Ticket',
    category: 'ticket_reply',
    email_subject: 'Re: Ticket #{ticket_number} - {ticket_subject}',
    email_html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .reply-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .label { font-weight: bold; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Nova Resposta no Ticket</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #{ticket_number}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{client_name}</strong>,</p>
      <p>Recebemos uma nova resposta no seu ticket:</p>
      
      <div class="reply-box">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
          <strong>{staff_name}</strong> respondeu em {reply_date}
        </p>
        <div style="padding-top: 10px; border-top: 1px solid #e5e7eb;">
          {reply_message}
        </div>
      </div>

      <center>
        <a href="{ticket_url}" class="button">Ver Ticket e Responder</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        <span class="label">Ticket:</span> #{ticket_number} - {ticket_subject}
      </p>
    </div>
    <div class="footer">
      <p>© {company_name} - Todos os direitos reservados</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
    `,
    whatsapp_template: `💬 *Nova Resposta no Ticket*

Olá *{client_name}*!

Recebemos uma nova resposta no seu ticket:

📋 *Ticket:* #{ticket_number}
👤 *Respondido por:* {staff_name}
📅 *Data:* {reply_date}

*Resposta:*
{reply_message}

Acesse o ticket para ver mais detalhes e responder:
{ticket_url}

_Atenciosamente,_
*{company_name}*`,
  },

  ticket_closed: {
    name: 'Ticket Fechado',
    category: 'ticket_closed',
    email_subject: 'Ticket #{ticket_number} Fechado - {ticket_subject}',
    email_html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .summary-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
    .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .label { font-weight: bold; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✓ Ticket Fechado</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #{ticket_number}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{client_name}</strong>,</p>
      <p>Seu ticket foi fechado com sucesso.</p>
      
      <div class="summary-box">
        <p><span class="label">Número do Ticket:</span> #{ticket_number}</p>
        <p><span class="label">Assunto:</span> {ticket_subject}</p>
        <p><span class="label">Data de Abertura:</span> {ticket_opened_date}</p>
        <p><span class="label">Data de Fechamento:</span> {ticket_closed_date}</p>
        <p><span class="label">Tempo de Resolução:</span> {resolution_time}</p>
      </div>

      <p>Esperamos ter resolvido sua questão satisfatoriamente.</p>

      <center>
        <a href="{feedback_url}" class="button">Avaliar Atendimento</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Se precisar de mais ajuda, você pode reabrir este ticket ou criar um novo.
      </p>
    </div>
    <div class="footer">
      <p>© {company_name} - Todos os direitos reservados</p>
      <p>Obrigado por confiar em nossos serviços!</p>
    </div>
  </div>
</body>
</html>
    `,
    whatsapp_template: `✅ *Ticket Fechado*

Olá *{client_name}*!

Seu ticket foi fechado com sucesso.

📋 *Resumo:*
• Número: #{ticket_number}
• Assunto: {ticket_subject}
• Aberto em: {ticket_opened_date}
• Fechado em: {ticket_closed_date}
• Tempo de resolução: {resolution_time}

Esperamos ter resolvido sua questão satisfatoriamente!

Por favor, avalie nosso atendimento:
{feedback_url}

Se precisar de mais ajuda, estamos à disposição.

_Atenciosamente,_
*{company_name}*`,
  },

  payment_reminder: {
    name: 'Lembrete de Pagamento',
    category: 'payment_reminder',
    email_subject: 'Lembrete: Fatura #{invoice_number} - Vencimento em {days_until_due} dias',
    email_html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .invoice-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .label { font-weight: bold; color: #4b5563; }
    .amount { font-size: 32px; font-weight: bold; color: #f59e0b; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">💰 Lembrete de Pagamento</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Fatura #{invoice_number}</p>
    </div>
    <div class="content">
      <p>Olá <strong>{client_name}</strong>,</p>
      <p>Este é um lembrete amigável sobre sua fatura pendente.</p>
      
      <div class="invoice-box">
        <p><span class="label">Número da Fatura:</span> #{invoice_number}</p>
        <p><span class="label">Data de Vencimento:</span> {due_date}</p>
        <p><span class="label">Dias até o vencimento:</span> {days_until_due} dias</p>
        
        <center>
          <div class="amount">R$ {invoice_amount}</div>
        </center>

        <p><span class="label">Descrição:</span></p>
        <p>{invoice_description}</p>
      </div>

      <center>
        <a href="{payment_url}" class="button">Pagar Agora</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Se você já efetuou o pagamento, por favor desconsidere este email.
      </p>
    </div>
    <div class="footer">
      <p>© {company_name} - Todos os direitos reservados</p>
      <p>Dúvidas? Entre em contato conosco.</p>
    </div>
  </div>
</body>
</html>
    `,
    whatsapp_template: `💰 *Lembrete de Pagamento*

Olá *{client_name}*!

Este é um lembrete sobre sua fatura pendente:

📄 *Detalhes da Fatura:*
• Número: #{invoice_number}
• Valor: *R$ {invoice_amount}*
• Vencimento: {due_date}
• Faltam: {days_until_due} dias

*Descrição:*
{invoice_description}

Pague agora pelo link:
{payment_url}

Se você já efetuou o pagamento, desconsidere esta mensagem.

_Atenciosamente,_
*{company_name}*`,
  },
};

// Variáveis disponíveis para uso nos templates
export const TEMPLATE_VARIABLES = {
  client: [
    { key: '{client_name}', description: 'Nome do cliente' },
    { key: '{client_email}', description: 'Email do cliente' },
    { key: '{client_phone}', description: 'Telefone do cliente' },
    { key: '{client_company}', description: 'Empresa do cliente' },
  ],
  ticket: [
    { key: '{ticket_number}', description: 'Número do ticket' },
    { key: '{ticket_subject}', description: 'Assunto do ticket' },
    { key: '{ticket_message}', description: 'Mensagem do ticket' },
    { key: '{ticket_status}', description: 'Status do ticket' },
    { key: '{ticket_priority}', description: 'Prioridade do ticket' },
    { key: '{ticket_url}', description: 'Link para o ticket' },
    { key: '{ticket_opened_date}', description: 'Data de abertura' },
    { key: '{ticket_closed_date}', description: 'Data de fechamento' },
    { key: '{resolution_time}', description: 'Tempo de resolução' },
  ],
  department: [
    { key: '{department_name}', description: 'Nome do departamento' },
    { key: '{department_email}', description: 'Email do departamento' },
  ],
  staff: [
    { key: '{staff_name}', description: 'Nome do atendente' },
    { key: '{staff_email}', description: 'Email do atendente' },
    { key: '{reply_message}', description: 'Mensagem de resposta' },
    { key: '{reply_date}', description: 'Data da resposta' },
  ],
  company: [
    { key: '{company_name}', description: 'Nome da empresa' },
    { key: '{company_email}', description: 'Email da empresa' },
    { key: '{company_phone}', description: 'Telefone da empresa' },
    { key: '{company_website}', description: 'Site da empresa' },
  ],
  invoice: [
    { key: '{invoice_number}', description: 'Número da fatura' },
    { key: '{invoice_amount}', description: 'Valor da fatura' },
    { key: '{invoice_description}', description: 'Descrição da fatura' },
    { key: '{due_date}', description: 'Data de vencimento' },
    { key: '{days_until_due}', description: 'Dias até vencimento' },
    { key: '{payment_url}', description: 'Link de pagamento' },
  ],
  other: [
    { key: '{feedback_url}', description: 'Link de avaliação' },
  ],
};
