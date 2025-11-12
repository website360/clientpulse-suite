-- Remove legacy WhatsApp trigger for ticket creation
-- This trigger was calling send-whatsapp directly with old layout
-- Now we use send-notification with configured templates
DROP TRIGGER IF EXISTS trigger_notify_ticket_created_whatsapp ON public.tickets;
DROP FUNCTION IF EXISTS public.notify_ticket_created_whatsapp();

-- Remove legacy Email trigger for ticket creation
-- This trigger was calling send-email directly with old layout
-- Now we use send-notification with configured templates
DROP TRIGGER IF EXISTS on_ticket_created_email ON public.tickets;
DROP FUNCTION IF EXISTS public.notify_ticket_created_email();