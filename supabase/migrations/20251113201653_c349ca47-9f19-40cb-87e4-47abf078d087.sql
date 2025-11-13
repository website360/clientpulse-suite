-- Rollback: Restaurar create_maintenance_execution para versão simples e estável
DROP FUNCTION IF EXISTS public.create_maintenance_execution(UUID, DATE, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_maintenance_execution(
  p_plan_id UUID,
  p_next_date DATE,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Inserir itens em batch (sem loop explícito)
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
      (item->>'status')::maintenance_item_status,
      NULLIF(item->>'notes', '')
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  RETURN v_exec_id;
END;
$$;