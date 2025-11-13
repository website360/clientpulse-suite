-- Debug detalhado da RPC create_maintenance_execution
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
  v_item_index INTEGER := 0;
BEGIN
  -- Validate admin role
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem registrar manutenções';
  END IF;

  -- Log inicial
  RAISE NOTICE 'create_maintenance_execution: Recebido % items', jsonb_array_length(p_items);

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

  RAISE NOTICE 'Execution ID criado: %', v_exec_id;

  -- Insert maintenance execution items if provided
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_item_index := v_item_index + 1;
      
      -- Log do item recebido
      RAISE NOTICE 'Item %: %', v_item_index, v_item::TEXT;
      
      -- Extrair status
      v_status_text := v_item->>'status';
      RAISE NOTICE 'Item % status extraído: [%] (tipo: %)', v_item_index, v_status_text, pg_typeof(v_status_text);
      
      -- Validar NULL ou vazio
      IF v_status_text IS NULL THEN
        RAISE EXCEPTION 'Item % (ID: %) tem status NULL', v_item_index, v_item->>'checklist_item_id';
      END IF;
      
      IF TRIM(v_status_text) = '' THEN
        RAISE EXCEPTION 'Item % (ID: %) tem status vazio', v_item_index, v_item->>'checklist_item_id';
      END IF;
      
      -- Normalizar
      v_status_text := LOWER(TRIM(v_status_text));
      RAISE NOTICE 'Item % status normalizado: [%]', v_item_index, v_status_text;
      
      -- Validar valores aceitos
      IF v_status_text NOT IN ('done', 'not_needed', 'skipped') THEN
        RAISE EXCEPTION 'Item % tem status inválido: %. Aceitos: done, not_needed, skipped', v_item_index, v_status_text;
      END IF;
      
      -- Inserir item
      RAISE NOTICE 'Inserindo item % com status: %', v_item_index, v_status_text;
      
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
      
      RAISE NOTICE 'Item % inserido com sucesso', v_item_index;
    END LOOP;
  END IF;

  RAISE NOTICE 'Todos os % items foram processados', v_item_index;
  RETURN v_exec_id;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Erro ao converter status para enum no item %. Status: [%]', v_item_index, COALESCE(v_status_text, '<NULL>');
  WHEN OTHERS THEN
    RAISE;
END;
$$;