-- Drop trigger first, then function
DROP TRIGGER IF EXISTS normalize_ticket_status_before_update ON public.tickets;
DROP FUNCTION IF EXISTS public.normalize_ticket_status_trigger();
DROP FUNCTION IF EXISTS public.set_ticket_status(uuid, text);

-- Create new function for clients to mark tickets as resolved
CREATE OR REPLACE FUNCTION public.mark_ticket_as_resolved(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tickets
  SET 
    status = 'resolved',
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_ticket_id
    AND status NOT IN ('resolved', 'closed')
    AND (
      created_by = auth.uid()
      OR client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
      OR client_id IN (
        SELECT client_id FROM client_contacts WHERE user_id = auth.uid()
      )
    );
END;
$$;

-- Drop existing ticket policies
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets of their clients" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets for their clients" ON public.tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.tickets;

-- Create new simplified RLS policies for tickets
CREATE POLICY "Admins can manage all tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  OR client_id IN (SELECT client_id FROM client_contacts WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Clients can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  OR client_id IN (SELECT client_id FROM client_contacts WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);