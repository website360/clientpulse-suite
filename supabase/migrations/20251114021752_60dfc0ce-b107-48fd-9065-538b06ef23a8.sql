-- Corrigir a função notify_approval_requested que está causando erro de SQL
CREATE OR REPLACE FUNCTION public.notify_approval_requested()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_name TEXT;
  v_stage_name TEXT;
  v_client_email TEXT;
  v_client_phone TEXT;
BEGIN
  -- Buscar informações do projeto e cliente
  SELECT 
    proj.name,
    ps.name,
    c.email,
    c.phone
  INTO v_project_name, v_stage_name, v_client_email, v_client_phone
  FROM project_stages ps
  JOIN projects proj ON proj.id = ps.project_id
  JOIN clients c ON c.id = proj.client_id
  WHERE ps.id = NEW.project_stage_id;

  -- Enviar notificação
  PERFORM notify_event(
    'project_approval_requested',
    jsonb_build_object(
      'project_name', v_project_name,
      'stage_name', v_stage_name,
      'client_email', v_client_email,
      'client_phone', v_client_phone,
      'approval_url', 'https://sistema.com/approval/' || NEW.approval_token,
      'notes', COALESCE(NEW.notes, '')
    ),
    'project',
    (SELECT project_id FROM project_stages WHERE id = NEW.project_stage_id)
  );

  RETURN NEW;
END;
$function$;