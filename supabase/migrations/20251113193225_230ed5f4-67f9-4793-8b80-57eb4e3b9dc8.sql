-- Create RPC function for maintenance execution with SECURITY DEFINER
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
    FROM jsonb_array_elements(p_items) AS t(item);
  END IF;

  RETURN v_exec_id;
END;
$$;

-- Update trigger to handle 'done' status correctly
CREATE OR REPLACE FUNCTION public.trigger_maintenance_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_data jsonb;
  v_domain_url text;
  v_checklist text;
BEGIN
  -- Buscar dados do plano de manutenção e cliente
  SELECT 
    jsonb_build_object(
      'client_name', COALESCE(c.company_name, c.full_name),
      'client_email', c.email,
      'client_phone', c.phone
    ),
    d.domain
  INTO v_client_data, v_domain_url
  FROM maintenance_executions me
  JOIN client_maintenance_plans cmp ON cmp.id = me.maintenance_plan_id
  JOIN clients c ON c.id = cmp.client_id
  LEFT JOIN domains d ON d.id = cmp.domain_id
  WHERE me.id = NEW.id;

  -- Montar checklist dos itens executados (aceita 'done' e 'completed')
  SELECT STRING_AGG('✓ ' || mci.name, E'\n' ORDER BY mei.created_at)
  INTO v_checklist
  FROM maintenance_execution_items mei
  JOIN maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
  WHERE mei.maintenance_execution_id = NEW.id
    AND mei.status IN ('done', 'completed');

  -- Enviar notificação
  PERFORM notify_event(
    'maintenance_completed',
    v_client_data || jsonb_build_object(
      'site_url', COALESCE(v_domain_url, 'N/A'),
      'completed_date', TO_CHAR(NEW.executed_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
      'checklist', COALESCE(v_checklist, 'Nenhum item registrado'),
      'notes', COALESCE(NEW.notes, '')
    ),
    'maintenance',
    NEW.id
  );

  RETURN NEW;
END;
$$;