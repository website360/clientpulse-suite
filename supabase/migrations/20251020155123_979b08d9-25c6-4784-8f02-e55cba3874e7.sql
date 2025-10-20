-- Ensure set_ticket_status maps to canonical English enum values only
CREATE OR REPLACE FUNCTION public.set_ticket_status(p_ticket_id uuid, p_new_status text)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized TEXT;
  v_canonical TEXT;
  v_status public.ticket_status;
  v_ticket tickets;
BEGIN
  -- Normalize input
  v_normalized := lower(trim(p_new_status));

  -- Map to canonical group (always English)
  v_canonical := CASE v_normalized
    WHEN 'open' THEN 'open'
    WHEN 'aberto' THEN 'open'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'in progress' THEN 'in_progress'
    WHEN 'em andamento' THEN 'in_progress'
    WHEN 'waiting' THEN 'waiting'
    WHEN 'aguardando' THEN 'waiting'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'resolvido' THEN 'resolved'
    WHEN 'closed' THEN 'closed'
    WHEN 'fechado' THEN 'closed'
    ELSE NULL
  END;

  IF v_canonical IS NULL THEN
    RAISE EXCEPTION 'Status inválido: "%". Valores permitidos: open, in_progress, waiting, resolved, closed', p_new_status;
  END IF;

  -- Cast only canonical English value to enum
  v_status := v_canonical::public.ticket_status;

  -- Update ticket and timestamps
  UPDATE tickets
  SET 
    status = v_status,
    resolved_at = CASE WHEN v_canonical = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN v_canonical = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$function$;