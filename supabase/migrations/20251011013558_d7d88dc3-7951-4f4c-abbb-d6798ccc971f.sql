-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_ticket_created_email ON public.tickets;
DROP TRIGGER IF EXISTS on_ticket_status_changed_email ON public.tickets;
DROP TRIGGER IF EXISTS on_new_message_email ON public.ticket_messages;
DROP FUNCTION IF EXISTS public.notify_ticket_created_email();
DROP FUNCTION IF EXISTS public.notify_ticket_status_changed_email();
DROP FUNCTION IF EXISTS public.notify_new_message_email();

-- Create function to notify when ticket is created
CREATE OR REPLACE FUNCTION public.notify_ticket_created_email()
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

-- Create function to notify when ticket status changes
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed_email()
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

-- Create function to notify when new message is added
CREATE OR REPLACE FUNCTION public.notify_new_message_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_key', 'new_message',
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

-- Create triggers
CREATE TRIGGER on_ticket_created_email
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_created_email();

CREATE TRIGGER on_ticket_status_changed_email
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_changed_email();

CREATE TRIGGER on_new_message_email
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message_email();