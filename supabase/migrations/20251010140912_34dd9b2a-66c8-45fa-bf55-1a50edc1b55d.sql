-- Allow clients to close their own tickets
CREATE POLICY "Clients can close their own tickets"
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
  AND tickets.status != 'closed'
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM clients
    WHERE clients.id = tickets.client_id
    AND clients.user_id = auth.uid()
  )
  AND status = 'closed'
);