-- Create a secure function to close a ticket with proper enum value
create or replace function public.close_ticket(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets t
  set status = 'closed'::ticket_status,
      closed_at = now(),
      updated_at = now()
  where t.id = p_ticket_id
    and (
      t.created_by = auth.uid()
      or t.assigned_to = auth.uid()
      or exists (
        select 1 from public.clients c
        where c.id = t.client_id and c.user_id = auth.uid()
      )
      or public.has_role(auth.uid(), 'admin')
    );
end;
$$;