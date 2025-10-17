-- Robust status normalization with dynamic enum label resolution
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
  v_canonical TEXT;
  v_label TEXT;
  v_status public.ticket_status;
  v_ticket tickets;
BEGIN
  -- Normalize input
  v_normalized := lower(trim(p_new_status));

  -- Map to canonical group
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

  -- Pick the actual enum label that exists in this database for the canonical status
  v_label := CASE v_canonical
    WHEN 'open' THEN (
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'open'
        ) THEN 'open'
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'Aberto'
        ) THEN 'Aberto'
        ELSE 'open'
      END
    )
    WHEN 'in_progress' THEN (
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'in_progress'
        ) THEN 'in_progress'
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'Em Andamento'
        ) THEN 'Em Andamento'
        ELSE 'in_progress'
      END
    )
    WHEN 'waiting' THEN (
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'waiting'
        ) THEN 'waiting'
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'Aguardando'
        ) THEN 'Aguardando'
        ELSE 'waiting'
      END
    )
    WHEN 'resolved' THEN (
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'resolved'
        ) THEN 'resolved'
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'Resolvido'
        ) THEN 'Resolvido'
        ELSE 'resolved'
      END
    )
    WHEN 'closed' THEN (
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'closed'
        ) THEN 'closed'
        WHEN EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'ticket_status' AND e.enumlabel = 'Fechado'
        ) THEN 'Fechado'
        ELSE 'closed'
      END
    )
  END;

  -- Cast to enum type safely
  v_status := v_label::public.ticket_status;

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
$$;

-- Ensure execute permission exists
GRANT EXECUTE ON FUNCTION public.set_ticket_status(UUID, TEXT) TO authenticated;