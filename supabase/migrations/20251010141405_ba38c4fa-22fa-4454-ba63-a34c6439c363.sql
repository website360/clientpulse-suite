-- Remove both policies
DROP POLICY IF EXISTS "Clients can close their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can close their tickets" ON public.tickets;

-- Create a new policy that allows clients to update their tickets
CREATE POLICY "Clients can update their own tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM clients
    WHERE clients.id = tickets.client_id
    AND clients.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM clients
    WHERE clients.id = tickets.client_id
    AND clients.user_id = auth.uid()
  )
);