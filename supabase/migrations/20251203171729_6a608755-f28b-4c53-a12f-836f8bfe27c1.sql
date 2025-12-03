
CREATE OR REPLACE FUNCTION public.create_maintenance_execution(p_plan_id uuid, p_next_date date, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exec_id UUID;
  v_user_id UUID := auth.uid();
  v_client_data jsonb;
  v_domain_url text;
  v_checklist text;
BEGIN
  -- Validar role de admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem registrar manutenções';
  END IF;

  -- Inserir execução de manutenção (inicialmente FALSE)
  INSERT INTO maintenance_executions (
    maintenance_plan_id,
    executed_by,
    next_scheduled_date,
    notes,
    executed_at,
    whatsapp_sent,
    whatsapp_sent_at
  )
  VALUES (
    p_plan_id,
    v_user_id,
    p_next_date,
    p_notes,
    NOW(),
    FALSE,
    NULL
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
      CASE lower(trim(item->>'status'))
        WHEN 'completed' THEN 'done'::maintenance_item_status
        WHEN 'concluido' THEN 'done'::maintenance_item_status
        WHEN 'done' THEN 'done'::maintenance_item_status
        WHEN 'not_needed' THEN 'not_needed'::maintenance_item_status
        WHEN 'skipped' THEN 'skipped'::maintenance_item_status
        ELSE 'done'::maintenance_item_status
      END,
      NULLIF(item->>'notes', '')
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  -- Buscar dados para notificação
  SELECT 
    jsonb_build_object(
      'client_name', COALESCE(c.nickname, c.company_name, c.full_name),
      'client_email', c.email,
      'client_phone', c.phone
    ),
    d.domain
  INTO v_client_data, v_domain_url
  FROM client_maintenance_plans cmp
  JOIN clients c ON c.id = cmp.client_id
  LEFT JOIN domains d ON d.id = cmp.domain_id
  WHERE cmp.id = p_plan_id;

  -- Montar checklist formatado na ordem correta
  SELECT STRING_AGG(
    CASE 
      WHEN mei.status = 'done' THEN '✅ ' || mci.name || ': Realizado'
      WHEN mei.status = 'not_needed' THEN '☑️ ' || mci.name || ': Não houve necessidade'
      WHEN mei.status = 'skipped' THEN '⏭️ ' || mci.name || ': Pulado'
      ELSE '• ' || mci.name
    END,
    E'\n' 
    ORDER BY mci."order", mei.created_at
  )
  INTO v_checklist
  FROM maintenance_execution_items mei
  JOIN maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
  WHERE mei.maintenance_execution_id = v_exec_id;

  -- Enviar notificação via sistema centralizado
  PERFORM notify_event(
    'maintenance_completed',
    v_client_data || jsonb_build_object(
      'site_url', COALESCE(v_domain_url, 'N/A'),
      'completed_date', TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
      'checklist', COALESCE(v_checklist, 'Nenhum item registrado'),
      'notes', COALESCE(p_notes, '')
    ),
    'maintenance',
    v_exec_id
  );

  -- ATUALIZAR DIRETAMENTE whatsapp_sent após notify_event
  -- Não depende mais do trigger de logs que pode falhar
  UPDATE maintenance_executions 
  SET 
    whatsapp_sent = TRUE,
    whatsapp_sent_at = NOW(),
    updated_at = NOW()
  WHERE id = v_exec_id;

  RETURN v_exec_id;
END;
$function$;
