-- Create table for ticket WhatsApp templates
CREATE TABLE IF NOT EXISTS public.ticket_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage ticket WhatsApp templates"
  ON public.ticket_whatsapp_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.ticket_whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.ticket_whatsapp_templates (template_key, name, description, template_text) VALUES
('ticket_created_admin', 'Ticket Criado - Notificação Admin', 'Enviado ao admin quando um contato cria um ticket', '🎫 *Novo Ticket Criado*

📋 *Ticket #*{ticket_number}
👤 *Cliente:* {client_name}
📧 *Contato:* {contact_name}
📂 *Departamento:* {department}
⚡ *Prioridade:* {priority}

*Assunto:* {subject}

*Descrição:*
{description}'),

('ticket_created_client', 'Ticket Criado - Confirmação Cliente', 'Enviado ao cliente quando um contato cria um ticket', '✅ *Ticket Criado com Sucesso*

Olá {client_name},

Seu contato *{contact_name}* criou um novo ticket:

📋 *Ticket #*{ticket_number}
*Assunto:* {subject}

Em breve nossa equipe irá atendê-lo.'),

('admin_response', 'Resposta do Administrador', 'Enviado ao contato e cliente quando admin responde', '💬 *Nova Resposta no Ticket #*{ticket_number}

Olá {contact_name},

*{admin_name}* respondeu seu ticket:

*Assunto:* {subject}

*Mensagem:*
{message}'),

('status_changed', 'Status Alterado', 'Enviado quando admin altera status do ticket', '🔄 *Status do Ticket Atualizado*

Olá {contact_name},

O status do ticket #*{ticket_number}* foi alterado:

*Assunto:* {subject}
*Status Anterior:* {old_status}
*Novo Status:* {new_status}'),

('ticket_message', 'Nova Mensagem - Admin', 'Enviado ao admin quando contato envia mensagem', '💬 *Nova Mensagem no Ticket #*{ticket_number}

*De:* {contact_name}
*Cliente:* {client_name}
*Assunto:* {subject}

*Mensagem:*
{message}'),

('ticket_deleted', 'Ticket Excluído', 'Enviado quando admin exclui um ticket', '🗑️ *Ticket Excluído*

Olá {contact_name},

O ticket #*{ticket_number}* foi excluído:

*Assunto:* {subject}');