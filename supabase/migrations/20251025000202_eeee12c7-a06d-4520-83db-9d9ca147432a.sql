-- Harden normalization to eliminate enum cast errors from unexpected values

-- 1) Replace trigger function to return enum constants and safely fallback
CREATE OR REPLACE FUNCTION public.normalize_ticket_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_norm TEXT;
  v_status public.ticket_status;
BEGIN
  -- Only normalize when status actually changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_norm := lower(trim(NEW.status::text));

    -- Map PT/EN to enum constants directly (no text -> enum casting)
    v_status := CASE v_norm
      WHEN 'open' THEN 'open'::public.ticket_status
      WHEN 'aberto' THEN 'open'::public.ticket_status
      WHEN 'in_progress' THEN 'in_progress'::public.ticket_status
      WHEN 'in progress' THEN 'in_progress'::public.ticket_status
      WHEN 'em andamento' THEN 'in_progress'::public.ticket_status
      WHEN 'waiting' THEN 'waiting'::public.ticket_status
      WHEN 'aguardando' THEN 'waiting'::public.ticket_status
      WHEN 'resolved' THEN 'resolved'::public.ticket_status
      WHEN 'resolvido' THEN 'resolved'::public.ticket_status
      WHEN 'closed' THEN 'closed'::public.ticket_status
      WHEN 'fechado' THEN 'closed'::public.ticket_status
      ELSE NULL::public.ticket_status
    END;

    -- Safe fallback: keep previous valid enum when unknown input arrives
    IF v_status IS NULL THEN
      NEW.status := OLD.status;
    ELSE
      NEW.status := v_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Replace RPC to assign enum via CASE (no text cast) and compare using enum
CREATE OR REPLACE FUNCTION public.set_ticket_status(p_ticket_id uuid, p_new_status text)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_norm TEXT;
  v_status public.ticket_status;
  v_ticket tickets;
BEGIN
  -- Normalize to lowercase/trim
  v_norm := lower(trim(p_new_status));

  -- Map PT/EN to enum constants directly
  v_status := CASE v_norm
    WHEN 'open' THEN 'open'::public.ticket_status
    WHEN 'aberto' THEN 'open'::public.ticket_status
    WHEN 'in_progress' THEN 'in_progress'::public.ticket_status
    WHEN 'in progress' THEN 'in_progress'::public.ticket_status
    WHEN 'em andamento' THEN 'in_progress'::public.ticket_status
    WHEN 'waiting' THEN 'waiting'::public.ticket_status
    WHEN 'aguardando' THEN 'waiting'::public.ticket_status
    WHEN 'resolved' THEN 'resolved'::public.ticket_status
    WHEN 'resolvido' THEN 'resolved'::public.ticket_status
    WHEN 'closed' THEN 'closed'::public.ticket_status
    WHEN 'fechado' THEN 'closed'::public.ticket_status
    ELSE NULL::public.ticket_status
  END;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Status inválido: "%". Valores permitidos: open, in_progress, waiting, resolved, closed', p_new_status;
  END IF;

  -- Update with correct timestamps
  UPDATE tickets
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