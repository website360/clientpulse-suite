-- ============================================================================
-- Tickets: tags + histórico/auditoria + mesclagem
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
-- Idempotente: pode rodar de novo sem problema.
-- ============================================================================

-- 1) TAGS
--    Lista de etiquetas livres por ticket (ex.: 'site', 'urgente', 'cobranca').
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Índice GIN para filtrar por tag rapidamente
CREATE INDEX IF NOT EXISTS idx_tickets_tags
  ON public.tickets USING GIN (tags);

-- 2) MERGE / MESCLAGEM
--    Tickets duplicados podem ser mesclados; o ticket B vira `merged_into = A`
--    e suas mensagens/anexos são movidos para A pelo app.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS merged_into UUID
  REFERENCES public.tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_merged_into
  ON public.tickets(merged_into);

-- 3) HISTÓRICO / AUDITORIA
--    Log de alterações de campos importantes (status, prioridade, atendente,
--    departamento, tags). Apenas admins enxergam o log.
CREATE TABLE IF NOT EXISTS public.ticket_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_ticket
  ON public.ticket_activity_log(ticket_id, created_at DESC);

ALTER TABLE public.ticket_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ticket activity log" ON public.ticket_activity_log;
CREATE POLICY "Admins can read ticket activity log"
  ON public.ticket_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Função que grava as mudanças. SECURITY DEFINER para escrever apesar do RLS.
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, uid, 'status', OLD.status::text, NEW.status::text);
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, uid, 'priority', OLD.priority::text, NEW.priority::text);
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, uid, 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, uid, 'department_id', OLD.department_id::text, NEW.department_id::text);
  END IF;

  IF NEW.tags IS DISTINCT FROM OLD.tags THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (
      NEW.id, uid, 'tags',
      COALESCE(array_to_string(OLD.tags, ','), ''),
      COALESCE(array_to_string(NEW.tags, ','), '')
    );
  END IF;

  IF NEW.merged_into IS DISTINCT FROM OLD.merged_into THEN
    INSERT INTO public.ticket_activity_log(ticket_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, uid, 'merged_into', OLD.merged_into::text, NEW.merged_into::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
CREATE TRIGGER trigger_log_ticket_changes
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_changes();

-- Conferência rápida
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='tags') AS tags_column,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='merged_into') AS merged_into_column,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticket_activity_log') AS activity_log_table,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trigger_log_ticket_changes') AS audit_trigger;
