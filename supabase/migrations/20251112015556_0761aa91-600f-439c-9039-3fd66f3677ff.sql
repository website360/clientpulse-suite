-- ========================================
-- TRIGGERS PARA FINANCEIRO
-- ========================================

-- Trigger: Pagamento Recebido (accounts_receivable)
CREATE OR REPLACE FUNCTION trigger_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        'invoice_number', NEW.id::text,
        'amount', 'R$ ' || TRIM(TO_CHAR(NEW.amount, '999G999G999D99')),
        'payment_date', TO_CHAR(NEW.payment_date, 'DD/MM/YYYY'),
        'payment_method', COALESCE(NEW.payment_method, 'Não informado')
      ),
      'receivable',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_received ON accounts_receivable;
CREATE TRIGGER on_payment_received
  AFTER UPDATE ON accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_received();

-- ========================================
-- TRIGGERS PARA MANUTENÇÃO
-- ========================================

-- Trigger: Manutenção Agendada
CREATE OR REPLACE FUNCTION trigger_maintenance_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'scheduled_date', TO_CHAR(NEW.next_scheduled_date, 'DD/MM/YYYY'),
      'scheduled_time', '14:00'
    ),
    'maintenance',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_scheduled ON maintenance_executions;
CREATE TRIGGER on_maintenance_scheduled
  AFTER INSERT ON maintenance_executions
  FOR EACH ROW
  WHEN (NEW.next_scheduled_date IS NOT NULL)
  EXECUTE FUNCTION trigger_maintenance_scheduled();

-- Trigger: Manutenção Concluída (quando WhatsApp é enviado)
CREATE OR REPLACE FUNCTION trigger_maintenance_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_data jsonb;
  v_domain_url text;
  v_checklist_items text;
BEGIN
  IF NEW.whatsapp_sent = true AND OLD.whatsapp_sent = false THEN
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

    -- Buscar itens do checklist
    SELECT string_agg('✓ ' || mci.name, E'\n' ORDER BY mci.order)
    INTO v_checklist_items
    FROM maintenance_execution_items mei
    JOIN maintenance_checklist_items mci ON mci.id = mei.checklist_item_id
    WHERE mei.maintenance_execution_id = NEW.id
      AND mei.status = 'completed';

    -- Enviar notificação
    PERFORM notify_event(
      'maintenance_completed',
      v_client_data || jsonb_build_object(
        'site_url', COALESCE(v_domain_url, 'Site do cliente'),
        'completed_date', TO_CHAR(NEW.executed_at, 'DD/MM/YYYY'),
        'checklist', COALESCE(v_checklist_items, 'Manutenção realizada com sucesso')
      ),
      'maintenance',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_completed ON maintenance_executions;
CREATE TRIGGER on_maintenance_completed
  AFTER UPDATE ON maintenance_executions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_maintenance_completed();

-- ========================================
-- TRIGGERS PARA TAREFAS
-- ========================================

-- Trigger: Tarefa Atribuída
CREATE OR REPLACE FUNCTION trigger_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_data jsonb;
  v_creator_name text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
    -- Buscar dados do usuário atribuído
    SELECT jsonb_build_object(
      'assigned_to', p.full_name,
      'assigned_email', p.email,
      'assigned_phone', p.phone
    ) INTO v_assigned_data
    FROM profiles p
    WHERE p.id = NEW.assigned_to;

    -- Buscar nome do criador
    SELECT full_name INTO v_creator_name
    FROM profiles
    WHERE id = NEW.created_by;

    -- Enviar notificação
    PERFORM notify_event(
      'task_assigned',
      v_assigned_data || jsonb_build_object(
        'task_title', NEW.title,
        'assigned_by', v_creator_name,
        'due_date', TO_CHAR(NEW.due_date, 'DD/MM/YYYY'),
        'priority', NEW.priority,
        'task_url', 'https://sistema.com/tasks/' || NEW.id
      ),
      'task',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_assigned();