-- Corrigir create_maintenance_execution para só marcar whatsapp_sent se envio for bem-sucedido
CREATE OR REPLACE FUNCTION public.create_maintenance_execution(
  p_plan_id UUID,
  p_executed_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exec_id UUID;
  v_item JSONB;
  v_client_id UUID;
  v_client_name TEXT;
  v_client_email TEXT;
  v_client_phone TEXT;
  v_site_url TEXT;
  v_checklist TEXT := '';
  v_notification_sent BOOLEAN := FALSE;
BEGIN
  -- Criar execução
  INSERT INTO public.maintenance_executions (
    plan_id,
    executed_by,
    executed_at,
    notes,
    whatsapp_sent,
    whatsapp_sent_at
  ) VALUES (
    p_plan_id,
    p_executed_by,
    NOW(),
    p_notes,
    FALSE,
    NULL
  )
  RETURNING id INTO v_exec_id;

  -- Criar itens
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.maintenance_execution_items (
      maintenance_execution_id,
      checklist_item_id,
      status,
      notes
    ) VALUES (
      v_exec_id,
      (v_item->>'checklist_item_id')::UUID,
      v_item->>'status',
      v_item->>'notes'
    );
  END LOOP;

  -- Buscar dados do cliente
  SELECT 
    c.id,
    COALESCE(c.nickname, c.company_name, c.full_name),
    c.email,
    c.phone,
    d.domain
  INTO 
    v_client_id,
    v_client_name,
    v_client_email,
    v_client_phone,
    v_site_url
  FROM public.client_maintenance_plans cmp
  JOIN public.clients c ON c.id = cmp.client_id
  LEFT JOIN public.domains d ON d.id = cmp.domain_id
  WHERE cmp.id = p_plan_id;

  -- Montar checklist na ordem correta
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
  FROM public.maintenance_execution_items mei
  JOIN public.maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
  WHERE mei.maintenance_execution_id = v_exec_id;

  -- Tentar enviar notificação e capturar se foi bem-sucedida
  BEGIN
    PERFORM public.notify_event(
      'maintenance_completed',
      jsonb_build_object(
        'client_name', v_client_name,
        'client_email', v_client_email,
        'client_phone', v_client_phone,
        'site_url', COALESCE(v_site_url, 'N/A'),
        'completed_date', TO_CHAR(NOW(), 'DD/MM/YYYY'),
        'checklist', COALESCE(v_checklist, 'Nenhum item registrado'),
        'notes', COALESCE(p_notes, '')
      ),
      'maintenance',
      v_exec_id
    );
    
    -- Se chegou aqui, a notificação foi enviada com sucesso
    v_notification_sent := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se houve erro, registrar no log mas não falhar a execução
      RAISE WARNING 'Erro ao enviar notificação: %', SQLERRM;
      v_notification_sent := FALSE;
  END;

  -- Só marcar como enviado se a notificação foi bem-sucedida
  IF v_notification_sent THEN
    UPDATE public.maintenance_executions 
    SET 
      whatsapp_sent = TRUE,
      whatsapp_sent_at = NOW()
    WHERE id = v_exec_id;
  END IF;

  RETURN v_exec_id;
END;
$$;