-- ========================================
-- TRIGGERS PARA FINANCEIRO
-- ========================================

-- Trigger: Pagamento Recebido
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
        'invoice_number', 'REC-' || NEW.id::text,
        'amount', 'R$ ' || to_char(NEW.amount, 'FM999,999,990.00'),
        'payment_date', to_char(NEW.payment_date, 'DD/MM/YYYY'),
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

-- Trigger: Manutenção Concluída
CREATE OR REPLACE FUNCTION trigger_maintenance_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_data record;
  v_client_data jsonb;
  v_domain_url text;
BEGIN
  -- Buscar dados do plano de manutenção
  SELECT cmp.*, 
         COALESCE(c.company_name, c.full_name) as client_name,
         c.email as client_email,
         c.phone as client_phone,
         d.domain as domain_url
  INTO v_plan_data
  FROM client_maintenance_plans cmp
  JOIN clients c ON c.id = cmp.client_id
  LEFT JOIN domains d ON d.id = cmp.domain_id
  WHERE cmp.id = NEW.maintenance_plan_id;

  -- Preparar dados do cliente
  v_client_data := jsonb_build_object(
    'client_name', v_plan_data.client_name,
    'client_email', v_plan_data.client_email,
    'client_phone', v_plan_data.client_phone
  );

  -- Enviar notificação
  PERFORM notify_event(
    'maintenance_completed',
    v_client_data || jsonb_build_object(
      'site_url', COALESCE(v_plan_data.domain_url, 'Site do cliente'),
      'completed_date', to_char(NEW.executed_at, 'DD/MM/YYYY'),
      'checklist', COALESCE(NEW.notes, 'Manutenção realizada com sucesso')
    ),
    'maintenance',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_completed ON maintenance_executions;
CREATE TRIGGER on_maintenance_completed
  AFTER INSERT ON maintenance_executions
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
  IF NEW.assigned_to IS NOT NULL THEN
    -- Buscar dados do atribuído
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
        'due_date', CASE 
          WHEN NEW.due_date IS NOT NULL 
          THEN to_char(NEW.due_date, 'DD/MM/YYYY')
          ELSE 'Sem prazo'
        END,
        'priority', COALESCE(NEW.priority, 'média'),
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
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION trigger_task_assigned();