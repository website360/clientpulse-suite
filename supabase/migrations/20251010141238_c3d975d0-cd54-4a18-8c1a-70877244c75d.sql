-- Remove the problematic policy
DROP POLICY IF EXISTS "Clients can close their own tickets" ON public.tickets;

-- Create a simpler policy that allows clients to update only the status to 'closed'
CREATE POLICY "Clients can close their tickets"
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