-- Update function to set search_path properly
CREATE OR REPLACE FUNCTION public.set_ticket_status(
  p_ticket_id UUID,
  p_new_status TEXT
)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_normalized TEXT;
  v_status ticket_status;
  v_ticket tickets;
BEGIN
  -- Normalize input: lowercase and trim
  v_normalized := lower(trim(p_new_status));
  
  -- Map Portuguese and English variations to valid enum values
  v_status := CASE v_normalized
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
  
  -- Raise error if status is invalid
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Status inválido: "%". Valores permitidos: open, in_progress, waiting, resolved, closed', p_new_status;
  END IF;
  
  -- Update the ticket
  UPDATE tickets
  SET 
    status = v_status,
    resolved_at = CASE WHEN v_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN v_status = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;
  
  -- Return the updated ticket
  RETURN v_ticket;
END;
$$;

-- Ensure execute permission exists
GRANT EXECUTE ON FUNCTION public.set_ticket_status(UUID, TEXT) TO authenticated;