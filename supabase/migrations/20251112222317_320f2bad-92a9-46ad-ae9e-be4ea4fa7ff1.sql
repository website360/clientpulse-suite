-- Atualizar trigger_task_assigned para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.trigger_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assigned_data jsonb;
  v_created_by_name text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND 
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)) THEN
    
    -- Buscar dados do atribuído
    SELECT jsonb_build_object(
      'assigned_to', p.full_name,
      'assigned_email', p.email,
      'assigned_phone', p.phone
    ) INTO v_assigned_data
    FROM profiles p
    WHERE p.id = NEW.assigned_to;

    -- Buscar nome de quem criou/atribuiu
    SELECT full_name INTO v_created_by_name
    FROM profiles
    WHERE id = NEW.created_by;

    -- Enviar notificação
    PERFORM notify_event(
      'task_assigned',
      v_assigned_data || jsonb_build_object(
        'task_title', NEW.title,
        'assigned_by', v_created_by_name,
        'due_date', COALESCE(format_timestamp_br(NEW.due_date), 'Sem prazo'),
        'priority', COALESCE(NEW.priority, 'medium'),
        'description', COALESCE(NEW.description, ''),
        'task_url', 'https://sistema.com/tasks/' || NEW.id
      ),
      'task',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Atualizar trigger_payment_received para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.trigger_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_data jsonb;
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Buscar dados do cliente
    SELECT jsonb_build_object(
      'client_name', COALESCE(c.company_name, c.full_name),
      'client_email', c.email,
      'client_phone', c.phone
    ) INTO v_client_data
    FROM clients c
    WHERE c.id = NEW.client_id;

    -- Enviar notificação
    PERFORM notify_event(
      'payment_received',
      v_client_data || jsonb_build_object(
        'invoice_number', 'REC-' || NEW.id::text,
        'amount', 'R$ ' || TO_CHAR(NEW.amount, 'FM999G999G999D00'),
        'payment_date', TO_CHAR(NEW.payment_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
        'payment_method', COALESCE(NEW.payment_method, 'N/A')
      ),
      'receivable',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Atualizar trigger_maintenance_scheduled para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.trigger_maintenance_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_data jsonb;
  v_domain_url text;
BEGIN
  -- Buscar dados do cliente e domínio
  SELECT 
    jsonb_build_object(
      'client_name', COALESCE(c.company_name, c.full_name),
      'client_email', c.email,
      'client_phone', c.phone
    ),
    d.domain
  INTO v_client_data, v_domain_url
  FROM client_maintenance_plans cmp
  JOIN clients c ON c.id = cmp.client_id
  LEFT JOIN domains d ON d.id = cmp.domain_id
  WHERE cmp.id = NEW.maintenance_plan_id;

  -- Enviar notificação
  PERFORM notify_event(
    'maintenance_scheduled',
    v_client_data || jsonb_build_object(
      'site_url', COALESCE(v_domain_url, 'Site do cliente'),
      'scheduled_date', TO_CHAR(NEW.next_scheduled_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'),
      'scheduled_time', '14:00'
    ),
    'maintenance',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Atualizar trigger_maintenance_completed para usar timezone de Brasília
CREATE OR REPLACE FUNCTION public.trigger_maintenance_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Montar checklist dos itens executados
  SELECT STRING_AGG('✓ ' || mci.name, E'\n' ORDER BY mei.created_at)
  INTO v_checklist
  FROM maintenance_execution_items mei
  JOIN maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
  WHERE mei.maintenance_execution_id = NEW.id
    AND mei.status = 'completed';

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