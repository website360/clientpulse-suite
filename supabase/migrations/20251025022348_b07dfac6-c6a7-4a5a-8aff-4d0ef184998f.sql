-- Create admin-only status update RPC with normalization PT->EN
CREATE OR REPLACE FUNCTION public.update_ticket_status_admin(p_ticket_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_status public.ticket_status;
BEGIN
  -- Only admins can use
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar status';
  END IF;

  v_norm := lower(trim(coalesce(p_new_status, '')));

  -- Map PT/EN to enum
  v_status := CASE v_norm
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
  END::public.ticket_status;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Status inválido: %', p_new_status;
  END IF;

  UPDATE public.tickets
  SET 
    status = v_status,
    resolved_at = CASE WHEN v_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at   = CASE WHEN v_status = 'closed'   THEN now() ELSE closed_at   END,
    updated_at  = now()
  WHERE id = p_ticket_id;
END;
$$;