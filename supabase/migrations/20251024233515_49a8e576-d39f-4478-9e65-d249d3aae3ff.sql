-- Atualizar função set_ticket_status para sempre usar inglês
CREATE OR REPLACE FUNCTION public.set_ticket_status(p_ticket_id uuid, p_new_status text)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized TEXT;
  v_status public.ticket_status;
  v_ticket tickets;
BEGIN
  -- Normalizar entrada para sempre inglês (aceita PT ou EN)
  v_normalized := lower(trim(p_new_status));
  
  -- Mapear para enum inglês
  v_normalized := CASE v_normalized
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

  IF v_normalized IS NULL THEN
    RAISE EXCEPTION 'Status inválido: "%". Valores permitidos: open, in_progress, waiting, resolved, closed', p_new_status;
  END IF;

  -- Cast para enum
  v_status := v_normalized::public.ticket_status;

  -- Atualizar ticket com timestamps
  UPDATE tickets
  SET 
    status = v_status,
    resolved_at = CASE WHEN v_normalized = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN v_normalized = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$function$;

-- Criar função de normalização para trigger
CREATE OR REPLACE FUNCTION public.normalize_ticket_status_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_normalized TEXT;
BEGIN
  -- Se status está sendo modificado, normalizar
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_normalized := lower(trim(NEW.status::text));
    
    -- Mapear para enum inglês
    v_normalized := CASE v_normalized
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
      ELSE v_normalized
    END;
    
    NEW.status := v_normalized::public.ticket_status;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS normalize_ticket_status_before_update ON public.tickets;
CREATE TRIGGER normalize_ticket_status_before_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ticket_status_trigger();