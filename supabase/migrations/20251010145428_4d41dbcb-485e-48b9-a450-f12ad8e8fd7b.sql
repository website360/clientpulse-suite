-- Add 'contato' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contato';

-- Add user_id to client_contacts to link contacts to auth users
ALTER TABLE public.client_contacts
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies for tickets to include contacts
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can update their own tickets" ON public.tickets;

-- Recreate policies with contact support
CREATE POLICY "Users can view their tickets" ON public.tickets
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() 
  OR assigned_to = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = tickets.client_id 
    AND clients.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM client_contacts
    WHERE client_contacts.client_id = tickets.client_id
    AND client_contacts.user_id = auth.uid()
    AND client_contacts.id::text = tickets.created_by::text
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Clients and contacts can create tickets" ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tickets.client_id
      AND clients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM client_contacts
      WHERE client_contacts.client_id = tickets.client_id
      AND client_contacts.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Clients and contacts can update their tickets" ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = tickets.client_id 
    AND clients.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM client_contacts
    WHERE client_contacts.client_id = tickets.client_id
    AND client_contacts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = tickets.client_id 
    AND clients.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM client_contacts
    WHERE client_contacts.client_id = tickets.client_id
    AND client_contacts.user_id = auth.uid()
  )
);

-- Update client_contacts RLS to allow contacts to view their own data
CREATE POLICY "Contacts can view their own data" ON public.client_contacts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_contacts.client_id
    AND clients.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);