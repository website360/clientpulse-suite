-- Remove email triggers and functions for tickets with CASCADE

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_notify_ticket_created_email ON public.tickets;
DROP TRIGGER IF EXISTS trigger_notify_ticket_status_changed_email ON public.tickets;
DROP TRIGGER IF EXISTS trigger_notify_new_message_email ON public.ticket_messages;

-- Drop old trigger names if they exist
DROP TRIGGER IF EXISTS on_ticket_created_email ON public.tickets;
DROP TRIGGER IF EXISTS on_ticket_status_changed_email ON public.tickets;
DROP TRIGGER IF EXISTS on_new_message_email ON public.ticket_messages;

-- Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.notify_ticket_created_email() CASCADE;
DROP FUNCTION IF EXISTS public.notify_ticket_status_changed_email() CASCADE;
DROP FUNCTION IF EXISTS public.notify_new_message_email() CASCADE;