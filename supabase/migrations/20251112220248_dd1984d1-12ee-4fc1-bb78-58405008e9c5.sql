-- Remover trigger antiga de WhatsApp que está causando conflito
-- O novo sistema de notificações com templates já gerencia todos os envios

DROP TRIGGER IF EXISTS trigger_notify_ticket_created_whatsapp ON public.tickets;
DROP FUNCTION IF EXISTS public.notify_ticket_created_whatsapp();