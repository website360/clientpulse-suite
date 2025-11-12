-- Criar enum para tipos de eventos de notificação
CREATE TYPE notification_event_type AS ENUM (
  'ticket_created',
  'ticket_assigned',
  'ticket_status_changed',
  'ticket_message',
  'payment_due',
  'payment_overdue',
  'payment_received',
  'contract_expiring',
  'contract_expired',
  'domain_expiring',
  'domain_expired',
  'maintenance_scheduled',
  'maintenance_completed',
  'task_assigned',
  'task_due',
  'custom'
);

-- Criar enum para canais de notificação
CREATE TYPE notification_channel AS ENUM (
  'email',
  'telegram',
  'sms',
  'whatsapp'
);

-- Criar tabela de templates de notificação
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_type notification_event_type NOT NULL,
  channels notification_channel[] NOT NULL DEFAULT ARRAY['email']::notification_channel[],
  template_subject TEXT,
  template_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  send_to_admins BOOLEAN DEFAULT false,
  send_to_client BOOLEAN DEFAULT true,
  send_to_assigned BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela de log de notificações enviadas
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  event_type notification_event_type NOT NULL,
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para notification_templates
CREATE POLICY "Admins can manage notification templates"
  ON notification_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active templates"
  ON notification_templates
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Políticas para notification_logs
CREATE POLICY "Admins can view all notification logs"
  ON notification_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir templates padrão
INSERT INTO notification_templates (name, description, event_type, channels, template_subject, template_body, variables, send_to_client, created_by) VALUES
(
  'Novo Ticket Criado',
  'Notificação enviada quando um novo ticket é criado',
  'ticket_created',
  ARRAY['email', 'whatsapp']::notification_channel[],
  'Novo Ticket #{{ticket_number}} - {{subject}}',
  'Olá {{client_name}},

Seu ticket #{{ticket_number}} foi criado com sucesso!

📋 Assunto: {{subject}}
📝 Descrição: {{description}}
🏷️ Departamento: {{department}}
⚡ Prioridade: {{priority}}
📅 Criado em: {{created_at}}

Acompanhe o status do seu ticket através do portal.

Atenciosamente,
Equipe de Suporte',
  '[
    {"key": "ticket_number", "description": "Número do ticket"},
    {"key": "subject", "description": "Assunto do ticket"},
    {"key": "description", "description": "Descrição do ticket"},
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "department", "description": "Departamento responsável"},
    {"key": "priority", "description": "Prioridade do ticket"},
    {"key": "created_at", "description": "Data de criação"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Ticket Atribuído',
  'Notificação enviada quando um ticket é atribuído a um técnico',
  'ticket_assigned',
  ARRAY['email', 'telegram']::notification_channel[],
  'Ticket #{{ticket_number}} atribuído a você',
  'Olá {{assigned_name}},

Um novo ticket foi atribuído a você!

📋 Ticket: #{{ticket_number}}
📝 Assunto: {{subject}}
👤 Cliente: {{client_name}}
🏷️ Departamento: {{department}}
⚡ Prioridade: {{priority}}

Acesse o sistema para mais detalhes.',
  '[
    {"key": "ticket_number", "description": "Número do ticket"},
    {"key": "subject", "description": "Assunto do ticket"},
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "assigned_name", "description": "Nome do técnico atribuído"},
    {"key": "department", "description": "Departamento responsável"},
    {"key": "priority", "description": "Prioridade do ticket"}
  ]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Cobrança Vencendo',
  'Notificação enviada 3 dias antes do vencimento de uma cobrança',
  'payment_due',
  ARRAY['email', 'whatsapp']::notification_channel[],
  'Lembrete: Cobrança vencendo em {{days_until_due}} dias',
  'Olá {{client_name}},

Lembramos que você possui uma cobrança próxima ao vencimento:

💰 Valor: R$ {{amount}}
📅 Vencimento: {{due_date}}
📝 Descrição: {{description}}

Por favor, realize o pagamento até a data de vencimento para evitar juros e multas.

Atenciosamente,
Equipe Financeira',
  '[
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "amount", "description": "Valor da cobrança"},
    {"key": "due_date", "description": "Data de vencimento"},
    {"key": "description", "description": "Descrição da cobrança"},
    {"key": "days_until_due", "description": "Dias até o vencimento"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Pagamento Recebido',
  'Notificação enviada quando um pagamento é confirmado',
  'payment_received',
  ARRAY['email', 'whatsapp']::notification_channel[],
  'Pagamento recebido - Obrigado!',
  'Olá {{client_name}},

Confirmamos o recebimento do seu pagamento! 🎉

💰 Valor: R$ {{amount}}
📅 Data do Pagamento: {{payment_date}}
📝 Descrição: {{description}}

Obrigado pela sua confiança!

Atenciosamente,
Equipe Financeira',
  '[
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "amount", "description": "Valor pago"},
    {"key": "payment_date", "description": "Data do pagamento"},
    {"key": "description", "description": "Descrição do pagamento"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Manutenção Concluída',
  'Notificação enviada quando uma manutenção é concluída',
  'maintenance_completed',
  ARRAY['email', 'whatsapp']::notification_channel[],
  'Manutenção Concluída - {{domain}}',
  'Olá {{client_name}},

A manutenção do seu site foi concluída com sucesso! ✅

🌐 Domínio: {{domain}}
📅 Data: {{execution_date}}
👤 Executado por: {{executed_by}}

Checklist executado:
{{checklist}}

{{notes}}

Atenciosamente,
Equipe Técnica',
  '[
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "domain", "description": "Domínio do site"},
    {"key": "execution_date", "description": "Data da execução"},
    {"key": "executed_by", "description": "Quem executou"},
    {"key": "checklist", "description": "Itens do checklist"},
    {"key": "notes", "description": "Observações"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Contrato Vencendo',
  'Notificação enviada quando um contrato está próximo do vencimento',
  'contract_expiring',
  ARRAY['email', 'whatsapp', 'telegram']::notification_channel[],
  'Atenção: Contrato vencendo em {{days_until_expiry}} dias',
  'Olá {{client_name}},

Seu contrato está próximo do vencimento:

📄 Serviço: {{service_name}}
📅 Vencimento: {{end_date}}
⏰ Dias restantes: {{days_until_expiry}}

Entre em contato conosco para renovação!

Atenciosamente,
Equipe Comercial',
  '[
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "service_name", "description": "Nome do serviço"},
    {"key": "end_date", "description": "Data de vencimento"},
    {"key": "days_until_expiry", "description": "Dias até vencer"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Domínio Vencendo',
  'Notificação enviada quando um domínio está próximo do vencimento',
  'domain_expiring',
  ARRAY['email', 'whatsapp']::notification_channel[],
  'Urgente: Domínio {{domain}} vencendo em {{days_until_expiry}} dias',
  'Olá {{client_name}},

⚠️ Atenção! Seu domínio está próximo do vencimento:

🌐 Domínio: {{domain}}
📅 Vencimento: {{expiry_date}}
⏰ Dias restantes: {{days_until_expiry}}

É importante renovar o domínio antes do vencimento para evitar que seu site fique fora do ar.

Entre em contato urgente!

Atenciosamente,
Equipe Técnica',
  '[
    {"key": "client_name", "description": "Nome do cliente"},
    {"key": "domain", "description": "Nome do domínio"},
    {"key": "expiry_date", "description": "Data de vencimento"},
    {"key": "days_until_expiry", "description": "Dias até vencer"}
  ]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000'
);

-- Criar índices
CREATE INDEX idx_notification_templates_event_type ON notification_templates(event_type);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX idx_notification_logs_template_id ON notification_logs(template_id);
CREATE INDEX idx_notification_logs_event_type ON notification_logs(event_type);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_reference ON notification_logs(reference_type, reference_id);