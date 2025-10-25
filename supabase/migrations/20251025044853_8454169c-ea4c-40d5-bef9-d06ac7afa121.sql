-- Remove the 'suggestion' status from enum
-- Step 1: Remove default temporarily
ALTER TABLE public.tickets ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create new enum without 'suggestion'
CREATE TYPE ticket_status_temp AS ENUM ('waiting', 'in_progress', 'resolved', 'closed', 'open');

-- Step 3: Convert column to text
ALTER TABLE public.tickets ALTER COLUMN status TYPE text;

-- Step 4: Update any 'suggestion' values to 'waiting'
UPDATE public.tickets SET status = 'waiting' WHERE status = 'suggestion';

-- Step 5: Convert to new enum
ALTER TABLE public.tickets 
  ALTER COLUMN status TYPE ticket_status_temp 
  USING status::ticket_status_temp;

-- Step 6: Drop old enum and rename
DROP TYPE ticket_status;
ALTER TYPE ticket_status_temp RENAME TO ticket_status;

-- Step 7: Restore default
ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'waiting'::ticket_status;