-- Remove the default value first
ALTER TABLE public.tickets ALTER COLUMN status DROP DEFAULT;

-- Convert the column to text
ALTER TABLE public.tickets ALTER COLUMN status TYPE text;

-- Update any 'suggestion' or 'open' values to 'waiting'
UPDATE public.tickets SET status = 'waiting' WHERE status IN ('suggestion', 'open');

-- Drop the old enum
DROP TYPE IF EXISTS ticket_status CASCADE;

-- Create the new enum with only the 4 requested statuses
CREATE TYPE ticket_status AS ENUM ('waiting', 'in_progress', 'resolved', 'closed');

-- Convert the column back to enum with default
ALTER TABLE public.tickets 
  ALTER COLUMN status TYPE ticket_status 
  USING status::ticket_status,
  ALTER COLUMN status SET DEFAULT 'waiting'::ticket_status;