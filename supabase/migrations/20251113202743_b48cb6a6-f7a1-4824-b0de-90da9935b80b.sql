-- Atualizar função create_maintenance_execution com mapeamento defensivo de status
DROP FUNCTION IF EXISTS public.create_maintenance_execution(uuid, date, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_maintenance_execution(
  p_plan_id uuid, 
  p_next_date date, 
  p_notes text, 
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exec_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validar role de admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem registrar manutenções';
  END IF;

  -- Inserir execução de manutenção
  INSERT INTO maintenance_executions (
    maintenance_plan_id,
    executed_by,
    next_scheduled_date,
    notes,
    executed_at
  )
  VALUES (
    p_plan_id,
    v_user_id,
    p_next_date,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_exec_id;

  -- Inserir itens com normalização defensiva de status
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO maintenance_execution_items (
      maintenance_execution_id,
      checklist_item_id,
      status,
      notes
    )
    SELECT 
      v_exec_id,
      (item->>'checklist_item_id')::UUID,
      -- Mapeamento defensivo: "completed" → "done"
      CASE lower(trim(item->>'status'))
        WHEN 'completed' THEN 'done'::maintenance_item_status
        WHEN 'concluido' THEN 'done'::maintenance_item_status
        WHEN 'done' THEN 'done'::maintenance_item_status
        WHEN 'not_needed' THEN 'not_needed'::maintenance_item_status
        WHEN 'skipped' THEN 'skipped'::maintenance_item_status
        ELSE 'done'::maintenance_item_status -- fallback seguro
      END,
      NULLIF(item->>'notes', '')
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  RETURN v_exec_id;
END;
$function$;