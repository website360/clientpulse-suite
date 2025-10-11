-- Remover todos os triggers relacionados a email
DROP TRIGGER IF EXISTS on_ticket_created_email ON tickets;
DROP TRIGGER IF EXISTS trigger_notify_ticket_created_email ON tickets;
DROP TRIGGER IF EXISTS on_ticket_status_changed_email ON tickets;
DROP TRIGGER IF EXISTS trigger_notify_ticket_status_changed_email ON tickets;
DROP TRIGGER IF EXISTS on_new_message_email ON ticket_messages;
DROP TRIGGER IF EXISTS trigger_notify_new_message_email ON ticket_messages;

-- Agora remover as funções
DROP FUNCTION IF EXISTS notify_ticket_created_email() CASCADE;
DROP FUNCTION IF EXISTS notify_ticket_status_changed_email() CASCADE;
DROP FUNCTION IF EXISTS notify_new_message_email() CASCADE;

-- Criar nova função para enviar email quando ticket é criado
CREATE OR REPLACE FUNCTION notify_ticket_created_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_key', 'ticket_created',
      'ticket_id', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
    )
  );
  RETURN NEW;
END;
$$;

-- Criar nova função para enviar email quando status do ticket muda
CREATE OR REPLACE FUNCTION notify_ticket_status_changed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
      body := jsonb_build_object(
        'template_key', 'ticket_status_changed',
        'ticket_id', NEW.id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Criar nova função para enviar email quando nova mensagem é adicionada  
CREATE OR REPLACE FUNCTION notify_new_message_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_key', 'ticket_message_added',
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
    )
  );
  RETURN NEW;
END;
$$;

-- Criar triggers
CREATE TRIGGER trigger_notify_ticket_created_email
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created_email();

CREATE TRIGGER trigger_notify_ticket_status_changed_email
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_status_changed_email();

CREATE TRIGGER trigger_notify_new_message_email
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message_email();