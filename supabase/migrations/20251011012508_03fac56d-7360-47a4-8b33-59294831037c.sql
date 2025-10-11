-- Função para enviar email quando ticket é criado
CREATE OR REPLACE FUNCTION notify_ticket_created_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar edge function para enviar email
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'template_key', 'ticket_created',
      'ticket_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Função para enviar email quando status do ticket muda
CREATE OR REPLACE FUNCTION notify_ticket_status_changed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Chamar edge function para enviar email
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'template_key', 'ticket_status_changed',
        'ticket_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para enviar email quando nova mensagem é adicionada
CREATE OR REPLACE FUNCTION notify_new_message_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar edge function para enviar email
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'template_key', 'ticket_message_added',
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS on_ticket_created_email ON tickets;
DROP TRIGGER IF EXISTS on_ticket_status_changed_email ON tickets;
DROP TRIGGER IF EXISTS on_new_message_email ON ticket_messages;

-- Criar novos triggers
CREATE TRIGGER on_ticket_created_email
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created_email();

CREATE TRIGGER on_ticket_status_changed_email
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_status_changed_email();

CREATE TRIGGER on_new_message_email
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message_email();