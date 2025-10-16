-- Criar função para enviar WhatsApp quando ticket for criado
CREATE OR REPLACE FUNCTION public.notify_ticket_created_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enviar WhatsApp notificando sobre novo ticket
  PERFORM net.http_post(
    url := 'https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/send-whatsapp',
    body := jsonb_build_object(
      'action', 'send_ticket_notification',
      'ticket_id', NEW.id,
      'event_type', 'ticket_created'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbmJzdXdreHp4Y2ZhZXR5d2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM4NDksImV4cCI6MjA3NTQ3OTg0OX0.LNtnhVO7Ma06WOKfWvWis5M4G7bIHKzN0OsAZo_zQR0'
    )
  );
  RETURN NEW;
END;
$function$;

-- Criar trigger para enviar WhatsApp quando ticket for criado
DROP TRIGGER IF EXISTS trigger_notify_ticket_created_whatsapp ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_created_whatsapp
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_created_whatsapp();