-- Create ticket_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('suggestion', 'waiting', 'in_progress', 'resolved', 'closed', 'open');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to tickets table with default 'waiting'
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS status ticket_status NOT NULL DEFAULT 'waiting'::ticket_status;