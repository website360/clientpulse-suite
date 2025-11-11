-- ====================================
-- 4.1 COMUNICAÇÃO: Anexos e Mensagens Importantes
-- ====================================

-- Adicionar campos para anexos múltiplos e marcação de importantes
ALTER TABLE ticket_messages 
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Índice para buscar mensagens importantes rapidamente
CREATE INDEX IF NOT EXISTS idx_ticket_messages_important 
ON ticket_messages(ticket_id, is_important) 
WHERE is_important = TRUE;

-- ====================================
-- 4.2 SLA E MÉTRICAS
-- ====================================

-- Tabela de configuração de SLA
CREATE TABLE IF NOT EXISTS ticket_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_minutes INTEGER NOT NULL, -- Tempo para primeira resposta
  resolution_minutes INTEGER NOT NULL, -- Tempo para resolução
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, priority)
);

-- Índices para SLA configs
CREATE INDEX IF NOT EXISTS idx_sla_configs_active ON ticket_sla_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_sla_configs_dept ON ticket_sla_configs(department_id);

-- Tabela de rastreamento de SLA para cada ticket
CREATE TABLE IF NOT EXISTS ticket_sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sla_config_id UUID REFERENCES ticket_sla_configs(id) ON DELETE SET NULL,
  first_response_due_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  first_response_breached BOOLEAN DEFAULT FALSE,
  resolution_due_at TIMESTAMPTZ,
  resolution_at TIMESTAMPTZ,
  resolution_breached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id)
);

-- Índices para tracking
CREATE INDEX IF NOT EXISTS idx_sla_tracking_ticket ON ticket_sla_tracking(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_breached ON ticket_sla_tracking(first_response_breached, resolution_breached);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_due ON ticket_sla_tracking(first_response_due_at, resolution_due_at);

-- Tabela de avaliações de satisfação
CREATE TABLE IF NOT EXISTS ticket_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id)
);

-- Índice para ratings
CREATE INDEX IF NOT EXISTS idx_ticket_ratings_ticket ON ticket_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_ratings_rating ON ticket_ratings(rating);

-- ====================================
-- 4.3 AUTOMAÇÕES
-- ====================================

-- Tabela de macros (respostas rápidas)
CREATE TABLE IF NOT EXISTS ticket_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shortcut TEXT UNIQUE, -- Ex: "/saudacao"
  content TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para macros
CREATE INDEX IF NOT EXISTS idx_macros_active ON ticket_macros(is_active);
CREATE INDEX IF NOT EXISTS idx_macros_shortcut ON ticket_macros(shortcut);
CREATE INDEX IF NOT EXISTS idx_macros_dept ON ticket_macros(department_id);

-- Tabela de regras de escalonamento
CREATE TABLE IF NOT EXISTS ticket_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  hours_without_response INTEGER NOT NULL,
  escalate_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para escalation rules
CREATE INDEX IF NOT EXISTS idx_escalation_active ON ticket_escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_dept ON ticket_escalation_rules(department_id);

-- Tabela de configuração de fechamento automático
CREATE TABLE IF NOT EXISTS ticket_auto_close_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  days_after_resolved INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO ticket_auto_close_config (days_after_resolved, is_active)
VALUES (7, TRUE)
ON CONFLICT DO NOTHING;

-- Adicionar campos de tracking em tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS resolution_time_minutes INTEGER;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tickets_last_response ON tickets(last_response_at);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved ON tickets(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_status_resolved ON tickets(status) WHERE status = 'resolved';

-- ====================================
-- TRIGGERS E FUNÇÕES
-- ====================================

-- Função para atualizar timestamps de resposta
CREATE OR REPLACE FUNCTION update_ticket_response_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar last_response_at do ticket
  UPDATE tickets 
  SET last_response_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  -- Se é a primeira resposta de um admin/técnico, calcular response_time
  IF NEW.user_id != (SELECT created_by FROM tickets WHERE id = NEW.ticket_id) THEN
    UPDATE tickets t
    SET response_time_minutes = EXTRACT(EPOCH FROM (NEW.created_at - t.created_at)) / 60
    WHERE t.id = NEW.ticket_id 
      AND t.response_time_minutes IS NULL;
      
    -- Atualizar SLA tracking
    UPDATE ticket_sla_tracking
    SET first_response_at = NEW.created_at,
        first_response_breached = (NEW.created_at > first_response_due_at),
        updated_at = NOW()
    WHERE ticket_id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar response time
DROP TRIGGER IF EXISTS trigger_update_ticket_response_time ON ticket_messages;
CREATE TRIGGER trigger_update_ticket_response_time
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_response_time();

-- Função para atualizar resolution time quando ticket é resolvido
CREATE OR REPLACE FUNCTION update_ticket_resolution_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    UPDATE tickets
    SET resolved_at = NOW(),
        resolution_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Atualizar SLA tracking
    UPDATE ticket_sla_tracking
    SET resolution_at = NOW(),
        resolution_breached = (NOW() > resolution_due_at),
        updated_at = NOW()
    WHERE ticket_id = NEW.id;
  END IF;
  
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    UPDATE tickets
    SET closed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para resolution time
DROP TRIGGER IF EXISTS trigger_update_ticket_resolution_time ON tickets;
CREATE TRIGGER trigger_update_ticket_resolution_time
  AFTER UPDATE ON tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_ticket_resolution_time();

-- Função para criar SLA tracking automaticamente
CREATE OR REPLACE FUNCTION create_ticket_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE
  sla_config RECORD;
BEGIN
  -- Buscar configuração de SLA para o departamento e prioridade
  SELECT * INTO sla_config
  FROM ticket_sla_configs
  WHERE department_id = NEW.department_id
    AND priority = NEW.priority::text
    AND is_active = TRUE
  LIMIT 1;
  
  -- Se encontrou configuração, criar tracking
  IF FOUND THEN
    INSERT INTO ticket_sla_tracking (
      ticket_id,
      sla_config_id,
      first_response_due_at,
      resolution_due_at
    ) VALUES (
      NEW.id,
      sla_config.id,
      NEW.created_at + (sla_config.first_response_minutes || ' minutes')::INTERVAL,
      NEW.created_at + (sla_config.resolution_minutes || ' minutes')::INTERVAL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar SLA tracking
DROP TRIGGER IF EXISTS trigger_create_ticket_sla_tracking ON tickets;
CREATE TRIGGER trigger_create_ticket_sla_tracking
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_sla_tracking();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as novas tabelas
DROP TRIGGER IF EXISTS update_ticket_sla_configs_updated_at ON ticket_sla_configs;
CREATE TRIGGER update_ticket_sla_configs_updated_at
  BEFORE UPDATE ON ticket_sla_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_macros_updated_at ON ticket_macros;
CREATE TRIGGER update_ticket_macros_updated_at
  BEFORE UPDATE ON ticket_macros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_escalation_rules_updated_at ON ticket_escalation_rules;
CREATE TRIGGER update_ticket_escalation_rules_updated_at
  BEFORE UPDATE ON ticket_escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- RLS POLICIES
-- ====================================

-- SLA Configs
ALTER TABLE ticket_sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SLA configs"
ON ticket_sla_configs FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active SLA configs"
ON ticket_sla_configs FOR SELECT
USING (is_active = TRUE OR has_role(auth.uid(), 'admin'));

-- SLA Tracking
ALTER TABLE ticket_sla_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all SLA tracking"
ON ticket_sla_tracking FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view SLA of their tickets"
ON ticket_sla_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_sla_tracking.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM clients c
          WHERE c.id = t.client_id AND c.user_id = auth.uid()
        )
      )
  )
);

-- Ticket Ratings
ALTER TABLE ticket_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ratings"
ON ticket_ratings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view ratings of their tickets"
ON ticket_ratings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_ratings.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR has_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Clients can rate their closed tickets"
ON ticket_ratings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN clients c ON c.id = t.client_id
    WHERE t.id = ticket_ratings.ticket_id
      AND c.user_id = auth.uid()
      AND t.status = 'closed'
  )
  AND rated_by = auth.uid()
);

-- Macros
ALTER TABLE ticket_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all macros"
ON ticket_macros FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active macros"
ON ticket_macros FOR SELECT
USING (is_active = TRUE);

-- Escalation Rules
ALTER TABLE ticket_escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage escalation rules"
ON ticket_escalation_rules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Auto Close Config
ALTER TABLE ticket_auto_close_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto close config"
ON ticket_auto_close_config FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view auto close config"
ON ticket_auto_close_config FOR SELECT
USING (TRUE);

-- ====================================
-- DADOS INICIAIS
-- ====================================

-- Inserir configurações de SLA padrão para cada departamento
INSERT INTO ticket_sla_configs (department_id, priority, first_response_minutes, resolution_minutes)
SELECT 
  d.id,
  p.priority,
  CASE p.priority
    WHEN 'urgent' THEN 15
    WHEN 'high' THEN 60
    WHEN 'medium' THEN 240
    WHEN 'low' THEN 480
  END as first_response_minutes,
  CASE p.priority
    WHEN 'urgent' THEN 240
    WHEN 'high' THEN 480
    WHEN 'medium' THEN 1440
    WHEN 'low' THEN 2880
  END as resolution_minutes
FROM departments d
CROSS JOIN (
  SELECT unnest(ARRAY['urgent', 'high', 'medium', 'low']) as priority
) p
WHERE d.is_active = TRUE
ON CONFLICT (department_id, priority) DO NOTHING;

-- Inserir alguns macros padrão
INSERT INTO ticket_macros (name, shortcut, content, created_by)
SELECT 
  'Saudação Inicial',
  '/saudacao',
  'Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?',
  (SELECT id FROM auth.users WHERE has_role(id, 'admin') LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE has_role(id, 'admin'))
ON CONFLICT DO NOTHING;

INSERT INTO ticket_macros (name, shortcut, content, created_by)
SELECT 
  'Ticket Resolvido',
  '/resolvido',
  'Seu ticket foi resolvido. Se precisar de mais ajuda, não hesite em nos contatar novamente.',
  (SELECT id FROM auth.users WHERE has_role(id, 'admin') LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE has_role(id, 'admin'))
ON CONFLICT DO NOTHING;

INSERT INTO ticket_macros (name, shortcut, content, created_by)
SELECT 
  'Em Análise',
  '/analise',
  'Estamos analisando sua solicitação e retornaremos em breve com uma solução.',
  (SELECT id FROM auth.users WHERE has_role(id, 'admin') LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE has_role(id, 'admin'))
ON CONFLICT DO NOTHING;