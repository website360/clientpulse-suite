-- Recriar função com validação robusta de NULL
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
  v_item JSONB;
  v_status_text TEXT;
BEGIN
  -- Validate admin role
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem registrar manutenções';
  END IF;

  -- Insert maintenance execution
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

  -- Insert maintenance execution items if provided
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      -- Extrair status e verificar NULL ANTES de qualquer processamento
      v_status_text := v_item->>'status';
      
      -- CRÍTICO: Verificar NULL ou vazio antes de TRIM/LOWER
      IF v_status_text IS NULL OR TRIM(v_status_text) = '' THEN
        RAISE EXCEPTION 'Item sem status definido. Item ID: %', v_item->>'checklist_item_id';
      END IF;
      
      -- Agora sim, normalizar
      v_status_text := LOWER(TRIM(v_status_text));
      
      -- Validar que o status é válido
      IF v_status_text NOT IN ('done', 'not_needed', 'skipped') THEN
        RAISE EXCEPTION 'Status inválido: %. Valores aceitos: done, not_needed, skipped', v_status_text;
      END IF;
      
      INSERT INTO maintenance_execution_items (
        maintenance_execution_id,
        checklist_item_id,
        status,
        notes
      )
      VALUES (
        v_exec_id,
        (v_item->>'checklist_item_id')::UUID,
        CAST(v_status_text AS maintenance_item_status),
        NULLIF(v_item->>'notes', '')
      );
    END LOOP;
  END IF;

  RETURN v_exec_id;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Erro ao converter status para enum. Status recebido: %', v_status_text;
  WHEN OTHERS THEN
    RAISE;
END;
$$;