-- Drop all ticket status related functions
DROP FUNCTION IF EXISTS public.update_ticket_status_admin(uuid, text);
DROP FUNCTION IF EXISTS public.mark_ticket_as_resolved(uuid);

-- Remove status column from tickets table
ALTER TABLE public.tickets DROP COLUMN IF EXISTS status;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS resolved_at;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS closed_at;