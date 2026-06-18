-- ============================================================
-- Bot de abertura de tickets via WhatsApp
-- Tabela de sessões da conversa (máquina de estados por número)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,          -- somente dígitos, com DDI 55
  step TEXT NOT NULL,                  -- estado atual da conversa
  data JSONB NOT NULL DEFAULT '{}',    -- {name, department_id, subject, description, attachments:[]}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_sessions_updated_at
  ON public.whatsapp_bot_sessions(updated_at);

-- RLS: somente a service_role (edge function) acessa. Nada para anon/authenticated.
ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;

-- Trigger de updated_at (mesma função usada nas demais tabelas)
CREATE TRIGGER update_whatsapp_bot_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Configurações do bot em integration_settings
-- ============================================================
INSERT INTO public.integration_settings (key, value)
VALUES
  ('whatsapp_bot_enabled', 'false'),
  ('whatsapp_webhook_token', encode(gen_random_bytes(16), 'hex'))
ON CONFLICT (key) DO NOTHING;
