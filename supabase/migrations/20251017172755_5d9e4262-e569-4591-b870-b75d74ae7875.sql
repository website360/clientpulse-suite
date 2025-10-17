-- Remove Google Calendar integration tables and column

-- Drop google_calendar_tokens table
DROP TABLE IF EXISTS public.google_calendar_tokens CASCADE;

-- Drop google_calendar_settings table
DROP TABLE IF EXISTS public.google_calendar_settings CASCADE;

-- Remove google_event_id column from tasks table if exists
ALTER TABLE public.tasks DROP COLUMN IF EXISTS google_event_id;