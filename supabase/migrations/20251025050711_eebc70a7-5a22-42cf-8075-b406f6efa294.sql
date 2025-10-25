-- Set a safe default for tickets.status to one of the 4 valid values
ALTER TABLE public.tickets 
  ALTER COLUMN status SET DEFAULT 'waiting';

-- Replace trigger function to avoid any reference to deprecated 'open'
CREATE OR REPLACE FUNCTION public.normalize_ticket_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_status public.ticket_status;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_norm := lower(trim(NEW.status::text));

    -- Map only the 4 allowed statuses (PT/EN synonyms supported)
    v_status := CASE v_norm
      WHEN 'waiting' THEN 'waiting'::public.ticket_status
      WHEN 'aguardando' THEN 'waiting'::public.ticket_status
      WHEN 'in_progress' THEN 'in_progress'::public.ticket_status
      WHEN 'in progress' THEN 'in_progress'::public.ticket_status
      WHEN 'em atendimento' THEN 'in_progress'::public.ticket_status
      WHEN 'resolved' THEN 'resolved'::public.ticket_status
      WHEN 'resolvido' THEN 'resolved'::public.ticket_status
      WHEN 'closed' THEN 'closed'::public.ticket_status
      WHEN 'concluído' THEN 'closed'::public.ticket_status
      WHEN 'concluido' THEN 'closed'::public.ticket_status
      ELSE NULL::public.ticket_status
    END;

    IF v_status IS NULL THEN
      -- Keep previous valid value if normalization failed
      NEW.status := OLD.status;
    ELSE
      NEW.status := v_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure the BEFORE UPDATE trigger exists and uses the updated function
DROP TRIGGER IF EXISTS normalize_ticket_status_before_update ON public.tickets;
CREATE TRIGGER normalize_ticket_status_before_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ticket_status_trigger();

-- Replace RPC helper without any 'open' mention
CREATE OR REPLACE FUNCTION public.set_ticket_status(p_ticket_id uuid, p_new_status text)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_status public.ticket_status;
  v_ticket public.tickets;
BEGIN
  v_norm := lower(trim(p_new_status));

  v_status := CASE v_norm
    WHEN 'waiting' THEN 'waiting'::public.ticket_status
    WHEN 'aguardando' THEN 'waiting'::public.ticket_status
    WHEN 'in_progress' THEN 'in_progress'::public.ticket_status
    WHEN 'in progress' THEN 'in_progress'::public.ticket_status
    WHEN 'em atendimento' THEN 'in_progress'::public.ticket_status
    WHEN 'resolved' THEN 'resolved'::public.ticket_status
    WHEN 'resolvido' THEN 'resolved'::public.ticket_status
    WHEN 'closed' THEN 'closed'::public.ticket_status
    WHEN 'concluído' THEN 'closed'::public.ticket_status
    WHEN 'concluido' THEN 'closed'::public.ticket_status
    ELSE NULL::public.ticket_status
  END;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Status inválido: "%". Valores permitidos: waiting, in_progress, resolved, closed', p_new_status;
  END IF;

  UPDATE public.tickets
  SET 
    status = v_status,
    resolved_at = CASE WHEN v_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at   = CASE WHEN v_status = 'closed'   THEN now() ELSE closed_at   END,
    updated_at  = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

-- Update notification function to stop comparing against 'open'
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Buscar o user_id do cliente
    SELECT c.user_id INTO client_user_id
    FROM clients c
    WHERE c.id = NEW.client_id;

    -- Mapear status para label em português (somente 4 estados)
    status_label := CASE NEW.status
      WHEN 'waiting' THEN 'Aguardando'
      WHEN 'in_progress' THEN 'Em Atendimento'
      WHEN 'resolved' THEN 'Resolvido'
      WHEN 'closed' THEN 'Concluído'
      ELSE NEW.status::text
    END;

    IF client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
      VALUES (
        client_user_id,
        'Status do ticket #' || NEW.ticket_number || ' alterado',
        'O status do seu ticket foi alterado para: ' || status_label,
        CASE NEW.status
          WHEN 'resolved' THEN 'success'
          WHEN 'closed' THEN 'success'
          ELSE 'info'
        END,
        'ticket',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;