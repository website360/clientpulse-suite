-- Allow clients to view the profiles of users participating in their tickets
CREATE POLICY "Profiles visible to ticket participants"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.ticket_messages tm
    JOIN public.tickets t ON t.id = tm.ticket_id
    JOIN public.clients c ON c.id = t.client_id
    WHERE tm.user_id = profiles.id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tickets t
    JOIN public.clients c ON c.id = t.client_id
    WHERE c.user_id = auth.uid() AND (t.assigned_to = profiles.id OR t.created_by = profiles.id)
  )
);
