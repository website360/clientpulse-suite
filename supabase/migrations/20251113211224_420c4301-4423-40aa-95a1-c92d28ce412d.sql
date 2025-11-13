-- Atualizar trigger para formatar checklist com todos os itens e seus status
CREATE OR REPLACE FUNCTION public.trigger_maintenance_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Montar checklist formatado com TODOS os itens e seus status
  SELECT STRING_AGG(
    CASE 
      WHEN mei.status = 'done' THEN '✅ ' || mci.name || ': Realizado'
      WHEN mei.status = 'not_needed' THEN '☑️ ' || mci.name || ': Não houve necessidade'
      WHEN mei.status = 'skipped' THEN '⏭️ ' || mci.name || ': Pulado'
      ELSE '• ' || mci.name
    END,
    E'\n' 
    ORDER BY mei.created_at
  )
  INTO v_checklist
  FROM maintenance_execution_items mei
  JOIN maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
  WHERE mei.maintenance_execution_id = NEW.id;

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
$function$;