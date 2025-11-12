-- Função para chamar edge function de notificação
CREATE OR REPLACE FUNCTION notify_event(
  p_event_type text,
  p_data jsonb,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
    ),
    body := jsonb_build_object(
      'event_type', p_event_type,
      'data', p_data,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send notification: %', SQLERRM;
END;
$$;

-- ========================================
-- TRIGGERS PARA TICKETS
-- ========================================

-- Trigger: Ticket Criado
CREATE OR REPLACE FUNCTION trigger_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_data jsonb;
  v_department_name text;
BEGIN
  -- Buscar dados do cliente
  SELECT jsonb_build_object(
    'client_name', COALESCE(c.company_name, c.full_name),
    'client_email', c.email,
    'client_phone', c.phone
  ) INTO v_client_data
  FROM clients c
  WHERE c.id = NEW.client_id;

  -- Buscar nome do departamento
  SELECT name INTO v_department_name
  FROM departments
  WHERE id = NEW.department_id;

  -- Enviar notificação
  PERFORM notify_event(
    'ticket_created',
    v_client_data || jsonb_build_object(
      'ticket_number', NEW.ticket_number,
      'subject', NEW.subject,
      'description', NEW.description,
      'department', v_department_name,
      'priority', NEW.priority::text,
      'ticket_url', 'https://sistema.com/tickets/' || NEW.id
    ),
    'ticket',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_created ON tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ticket_created();

-- Trigger: Ticket Atribuído
CREATE OR REPLACE FUNCTION trigger_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_data jsonb;
  v_client_name text;
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Buscar dados do atribuído
    SELECT jsonb_build_object(
      'assigned_to', p.full_name,
      'assigned_email', p.email,
      'assigned_phone', p.phone
    ) INTO v_assigned_data
    FROM profiles p
    WHERE p.id = NEW.assigned_to;

    -- Buscar nome do cliente
    SELECT COALESCE(company_name, full_name) INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;

    -- Enviar notificação
    PERFORM notify_event(
      'ticket_assigned',
      v_assigned_data || jsonb_build_object(
        'ticket_number', NEW.ticket_number,
        'client_name', v_client_name,
        'subject', NEW.subject,
        'ticket_url', 'https://sistema.com/tickets/' || NEW.id
      ),
      'ticket',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_assigned ON tickets;
CREATE TRIGGER on_ticket_assigned
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ticket_assigned();

-- Trigger: Ticket Resolvido/Fechado
CREATE OR REPLACE FUNCTION trigger_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_data jsonb;
  v_event_type text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Buscar dados do cliente
    SELECT jsonb_build_object(
      'client_name', COALESCE(c.company_name, c.full_name),
      'client_email', c.email,
      'client_phone', c.phone
    ) INTO v_client_data
    FROM clients c
    WHERE c.id = NEW.client_id;

    -- Determinar evento baseado no status
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
      v_event_type := 'ticket_resolved';
      
      PERFORM notify_event(
        v_event_type,
        v_client_data || jsonb_build_object(
          'ticket_number', NEW.ticket_number,
          'subject', NEW.subject,
          'resolved_by', (SELECT full_name FROM profiles WHERE id = auth.uid()),
          'resolution_notes', 'Ticket resolvido pela equipe',
          'ticket_url', 'https://sistema.com/tickets/' || NEW.id
        ),
        'ticket',
        NEW.id
      );
    ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
      v_event_type := 'ticket_closed';
      
      PERFORM notify_event(
        v_event_type,
        v_client_data || jsonb_build_object(
          'ticket_number', NEW.ticket_number,
          'subject', NEW.subject,
          'closed_by', (SELECT full_name FROM profiles WHERE id = auth.uid()),
          'ticket_url', 'https://sistema.com/tickets/' || NEW.id
        ),
        'ticket',
        NEW.id
      );
    ELSIF OLD.status = 'closed' AND NEW.status != 'closed' THEN
      -- Ticket reaberto
      PERFORM notify_event(
        'ticket_reopened',
        v_client_data || jsonb_build_object(
          'ticket_number', NEW.ticket_number,
          'subject', NEW.subject,
          'reopened_by', (SELECT full_name FROM profiles WHERE id = auth.uid()),
          'reopen_reason', 'Ticket reaberto',
          'ticket_url', 'https://sistema.com/tickets/' || NEW.id
        ),
        'ticket',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_status_changed ON tickets;
CREATE TRIGGER on_ticket_status_changed
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ticket_status_changed();

-- Trigger: Resposta em Ticket
CREATE OR REPLACE FUNCTION trigger_ticket_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_data record;
  v_user_data jsonb;
  v_client_data jsonb;
  v_assigned_data jsonb;
  v_event_type text;
  v_is_admin boolean;
  v_is_client boolean;
  v_is_contact boolean;
BEGIN
  -- Buscar dados do ticket
  SELECT t.*, 
         COALESCE(c.company_name, c.full_name) as client_name,
         c.email as client_email,
         c.phone as client_phone,
         c.user_id as client_user_id
  INTO v_ticket_data
  FROM tickets t
  JOIN clients c ON c.id = t.client_id
  WHERE t.id = NEW.ticket_id;

  -- Buscar dados do usuário que respondeu
  SELECT jsonb_build_object(
    'user_name', p.full_name,
    'user_email', p.email
  ) INTO v_user_data
  FROM profiles p
  WHERE p.id = NEW.user_id;

  -- Verificar tipo de usuário
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO v_is_admin;

  SELECT NEW.user_id = v_ticket_data.client_user_id INTO v_is_client;

  SELECT EXISTS (
    SELECT 1 FROM client_contacts WHERE user_id = NEW.user_id
  ) INTO v_is_contact;

  -- Preparar dados do cliente
  v_client_data := jsonb_build_object(
    'client_name', v_ticket_data.client_name,
    'client_email', v_ticket_data.client_email,
    'client_phone', v_ticket_data.client_phone
  );

  -- Preparar dados do atribuído (se houver)
  IF v_ticket_data.assigned_to IS NOT NULL THEN
    SELECT jsonb_build_object(
      'assigned_email', p.email,
      'assigned_phone', p.phone
    ) INTO v_assigned_data
    FROM profiles p
    WHERE p.id = v_ticket_data.assigned_to;
  END IF;

  -- Determinar tipo de evento e enviar notificação
  IF v_is_admin THEN
    v_event_type := 'ticket_response_admin';
    
    PERFORM notify_event(
      v_event_type,
      v_client_data || v_user_data || jsonb_build_object(
        'ticket_number', v_ticket_data.ticket_number,
        'subject', v_ticket_data.subject,
        'message', NEW.message,
        'admin_name', v_user_data->>'user_name',
        'ticket_url', 'https://sistema.com/tickets/' || NEW.ticket_id
      ),
      'ticket',
      NEW.ticket_id
    );
  ELSIF v_is_client THEN
    v_event_type := 'ticket_response_client';
    
    PERFORM notify_event(
      v_event_type,
      COALESCE(v_assigned_data, '{}'::jsonb) || v_client_data || jsonb_build_object(
        'ticket_number', v_ticket_data.ticket_number,
        'subject', v_ticket_data.subject,
        'message', NEW.message,
        'contact_name', v_user_data->>'user_name',
        'ticket_url', 'https://sistema.com/tickets/' || NEW.ticket_id
      ),
      'ticket',
      NEW.ticket_id
    );
  ELSIF v_is_contact THEN
    v_event_type := 'ticket_response_contact';
    
    PERFORM notify_event(
      v_event_type,
      COALESCE(v_assigned_data, '{}'::jsonb) || v_client_data || jsonb_build_object(
        'ticket_number', v_ticket_data.ticket_number,
        'subject', v_ticket_data.subject,
        'message', NEW.message,
        'contact_name', v_user_data->>'user_name',
        'ticket_url', 'https://sistema.com/tickets/' || NEW.ticket_id
      ),
      'ticket',
      NEW.ticket_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_response ON ticket_messages;
CREATE TRIGGER on_ticket_response
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ticket_response();