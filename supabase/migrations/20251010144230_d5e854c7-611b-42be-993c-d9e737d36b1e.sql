-- Harden close_ticket to handle both English and Portuguese enum labels
create or replace function public.close_ticket(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status public.ticket_status;
begin
  -- Detect available enum label for 'closed' (supports either 'closed' or 'Fechado')
  select (
    case 
      when exists (
        select 1 from pg_enum e 
        join pg_type t on t.oid = e.enumtypid 
        where t.typname = 'ticket_status' and e.enumlabel = 'closed'
      ) then 'closed'
      when exists (
        select 1 from pg_enum e 
        join pg_type t on t.oid = e.enumtypid 
        where t.typname = 'ticket_status' and e.enumlabel = 'Fechado'
      ) then 'Fechado'
      else 'closed' -- fallback
    end
  )::text::public.ticket_status into target_status;

  update public.tickets t
  set status = target_status,
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