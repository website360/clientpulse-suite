-- Create email_settings table
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  smtp_secure BOOLEAN NOT NULL DEFAULT true,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email settings
CREATE POLICY "Admins can manage email settings"
  ON public.email_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  send_to_admin BOOLEAN NOT NULL DEFAULT false,
  send_to_client BOOLEAN NOT NULL DEFAULT false,
  send_to_contact BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  template_key TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates in Portuguese
INSERT INTO public.email_templates (template_key, name, subject, body_html, body_text, send_to_admin, send_to_client, send_to_contact)
VALUES 
(
  'ticket_created',
  'Ticket Criado',
  'Novo Ticket #{{ticket_number}} - {{subject}}',
  '<html><body><h2>Novo Ticket Criado</h2><p><strong>Número:</strong> #{{ticket_number}}</p><p><strong>Cliente:</strong> {{client_name}}</p><p><strong>Assunto:</strong> {{subject}}</p><p><strong>Departamento:</strong> {{department}}</p><p><strong>Prioridade:</strong> {{priority}}</p><p><strong>Descrição:</strong></p><p>{{description}}</p><p><a href="{{url}}">Ver Ticket</a></p></body></html>',
  'Novo Ticket Criado\n\nNúmero: #{{ticket_number}}\nCliente: {{client_name}}\nAssunto: {{subject}}\nDepartamento: {{department}}\nPrioridade: {{priority}}\n\nDescrição:\n{{description}}\n\nVer ticket: {{url}}',
  true,
  true,
  false
),
(
  'ticket_status_changed',
  'Status do Ticket Alterado',
  'Ticket #{{ticket_number}} - Status alterado para {{status}}',
  '<html><body><h2>Status do Ticket Alterado</h2><p><strong>Número:</strong> #{{ticket_number}}</p><p><strong>Cliente:</strong> {{client_name}}</p><p><strong>Assunto:</strong> {{subject}}</p><p><strong>Novo Status:</strong> {{status}}</p><p><a href="{{url}}">Ver Ticket</a></p></body></html>',
  'Status do Ticket Alterado\n\nNúmero: #{{ticket_number}}\nCliente: {{client_name}}\nAssunto: {{subject}}\nNovo Status: {{status}}\n\nVer ticket: {{url}}',
  true,
  true,
  true
),
(
  'ticket_message_added',
  'Nova Mensagem no Ticket',
  'Nova mensagem no Ticket #{{ticket_number}}',
  '<html><body><h2>Nova Mensagem no Ticket</h2><p><strong>Número:</strong> #{{ticket_number}}</p><p><strong>Cliente:</strong> {{client_name}}</p><p><strong>Assunto:</strong> {{subject}}</p><p><strong>De:</strong> {{sender_name}}</p><p><strong>Mensagem:</strong></p><p>{{message}}</p><p><a href="{{url}}">Ver Ticket</a></p></body></html>',
  'Nova Mensagem no Ticket\n\nNúmero: #{{ticket_number}}\nCliente: {{client_name}}\nAssunto: {{subject}}\nDe: {{sender_name}}\n\nMensagem:\n{{message}}\n\nVer ticket: {{url}}',
  true,
  true,
  true
)
ON CONFLICT (template_key) DO NOTHING;