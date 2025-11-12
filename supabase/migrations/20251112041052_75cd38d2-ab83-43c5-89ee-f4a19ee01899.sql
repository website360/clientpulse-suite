-- Criar tabela de templates de lembretes de pagamento
CREATE TABLE IF NOT EXISTS payment_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  days_overdue INTEGER NOT NULL CHECK (days_overdue >= 0),
  channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
  template_subject TEXT,
  template_body TEXT NOT NULL,
  template_html TEXT,
  tone TEXT NOT NULL DEFAULT 'neutral' CHECK (tone IN ('friendly', 'neutral', 'firm', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  include_payment_link BOOLEAN NOT NULL DEFAULT true,
  send_to_client BOOLEAN NOT NULL DEFAULT true,
  send_to_contacts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(days_overdue, is_active)
);

-- Criar tabela de logs de lembretes enviados
CREATE TABLE IF NOT EXISTS payment_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  template_id UUID REFERENCES payment_reminder_templates(id) ON DELETE SET NULL,
  days_overdue INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  payment_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_reminder_templates_active ON payment_reminder_templates(is_active, days_overdue) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_reminder_logs_receivable ON payment_reminder_logs(receivable_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_logs_template ON payment_reminder_logs(template_id, sent_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payment_reminder_templates_updated_at
  BEFORE UPDATE ON payment_reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE payment_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Policies para payment_reminder_templates
CREATE POLICY "Admins can manage all reminder templates"
  ON payment_reminder_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active templates"
  ON payment_reminder_templates FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Policies para payment_reminder_logs
CREATE POLICY "Admins can view all reminder logs"
  ON payment_reminder_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert reminder logs"
  ON payment_reminder_logs FOR INSERT
  WITH CHECK (true);

-- Inserir templates padrão
INSERT INTO payment_reminder_templates (name, description, days_overdue, channels, template_subject, template_body, tone, include_payment_link) VALUES
(
  'Lembrete Amigável - 5 dias',
  'Lembrete suave para pagamentos com 5 dias de atraso',
  5,
  ARRAY['email', 'whatsapp']::TEXT[],
  'Lembrete: Pagamento pendente - {{description}}',
  E'Olá {{client_name}}! 😊\n\nNotamos que o pagamento de {{description}} no valor de {{amount}} venceu há {{days_overdue}} dias.\n\nSabemos que imprevistos acontecem. Que tal regularizar hoje mesmo?\n\n👉 Pagar agora: {{payment_link}}\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\n{{company_name}}',
  'friendly',
  true
),
(
  'Aviso Formal - 15 dias',
  'Aviso neutro para pagamentos com 15 dias de atraso',
  15,
  ARRAY['email', 'whatsapp']::TEXT[],
  'Aviso: Pagamento em atraso - {{description}}',
  E'Prezado(a) {{client_name}},\n\nIdentificamos que o pagamento referente a {{description}} ({{amount}}) encontra-se em aberto há {{days_overdue}} dias.\n\nPara evitar encargos adicionais, solicitamos a regularização urgente.\n\nLink para pagamento: {{payment_link}}\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nSetor Financeiro\n{{company_name}}',
  'neutral',
  true
),
(
  'Notificação Firme - 30 dias',
  'Notificação firme para pagamentos com 30 dias de atraso',
  30,
  ARRAY['email', 'whatsapp']::TEXT[],
  'IMPORTANTE: Cobrança vencida há {{days_overdue}} dias',
  E'{{client_name}},\n\nAVISO IMPORTANTE: Cobrança vencida há {{days_overdue}} dias.\n\nDébito: {{description}}\nValor: {{amount}}\nVencimento original: {{due_date}}\n\nA falta de regularização poderá resultar em:\n- Suspensão de serviços\n- Protesto do título\n- Inclusão em cadastros de inadimplência\n\n⚠️ Regularize URGENTEMENTE: {{payment_link}}\n\nDúvidas: Entre em contato conosco.\n\n{{company_name}}',
  'firm',
  true
),
(
  'Última Notificação - 60 dias',
  'Última notificação antes de medidas legais',
  60,
  ARRAY['email', 'whatsapp']::TEXT[],
  'ÚLTIMA NOTIFICAÇÃO - Ação legal iminente',
  E'ÚLTIMA NOTIFICAÇÃO - {{client_name}}\n\nDébito em aberto há {{days_overdue}} dias:\nValor: {{amount}}\nDescrição: {{description}}\n\nSem a regularização imediata, tomaremos as seguintes medidas:\n1. Protesto do título em cartório\n2. Inclusão nos órgãos de proteção ao crédito (SPC/Serasa)\n3. Cobrança judicial\n\n⚠️ PRAZO FINAL: 5 dias úteis\n\nLink de pagamento: {{payment_link}}\n\n{{company_name}} - Departamento Jurídico',
  'urgent',
  true
);