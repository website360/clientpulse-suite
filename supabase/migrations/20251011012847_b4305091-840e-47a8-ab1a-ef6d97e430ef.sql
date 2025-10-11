-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_ticket_created_email ON tickets;
DROP TRIGGER IF EXISTS on_ticket_status_changed_email ON tickets;
DROP TRIGGER IF EXISTS on_new_message_email ON ticket_messages;
DROP FUNCTION IF EXISTS notify_ticket_created_email();
DROP FUNCTION IF EXISTS notify_ticket_status_changed_email();
DROP FUNCTION IF EXISTS notify_new_message_email();

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to notify ticket created
CREATE OR REPLACE FUNCTION notify_ticket_created_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
    ),
    body := jsonb_build_object(
      'template_key', 'ticket_created',
      'ticket_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify ticket status changed
CREATE OR REPLACE FUNCTION notify_ticket_status_changed_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM extensions.http_post(
      url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
      ),
      body := jsonb_build_object(
        'template_key', 'ticket_status_changed',
        'ticket_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify new message
CREATE OR REPLACE FUNCTION notify_new_message_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
      ),
    body := jsonb_build_object(
      'template_key', 'new_message',
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
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