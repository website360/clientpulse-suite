-- Update function to also update contract statuses based on end_date
create or replace function public.check_expiring_contracts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  contract_record RECORD;
  days_until_expiry INTEGER;
begin
  -- First, normalize contract statuses based on end_date
  update public.contracts c
  set status = case
      when c.end_date is not null and c.end_date < current_date then 'expired'
      when c.end_date is not null and c.end_date <= current_date + interval '44 days' then 'expiring'
      else 'active'
    end,
    updated_at = now()
  where c.end_date is not null
    and (
      (c.status is distinct from 'expired' and c.end_date < current_date)
      or (c.status is distinct from 'expiring' and c.end_date between current_date and current_date + interval '44 days')
      or (c.status is distinct from 'active' and (c.end_date > current_date + interval '44 days'))
    );

  -- Check for contracts expiring in 30, 15, 7, 3, and 1 day(s)
  for contract_record in
    select 
      c.id,
      c.end_date,
      c.client_id,
      cl.full_name as client_name,
      cl.company_name,
      s.name as service_name,
      p.id as user_id
    from contracts c
    join clients cl on c.client_id = cl.id
    join services s on c.service_id = s.id
    left join profiles p on cl.user_id = p.id
    where c.end_date is not null
      and c.end_date > current_date
      and c.end_date <= current_date + interval '30 days'
      and c.status in ('active','expiring')
  loop
    days_until_expiry := contract_record.end_date - current_date;
    
    if days_until_expiry in (30, 15, 7, 3, 1) then
      if not exists (
        select 1 from notifications
        where reference_type = 'contract'
          and reference_id = contract_record.id
          and created_at::date = current_date
          and description like '%' || days_until_expiry || ' dia%'
      ) then
        insert into notifications (user_id, title, description, type, reference_type, reference_id)
        select 
          ur.user_id,
          'Contrato próximo do vencimento',
          'O contrato de ' || coalesce(contract_record.company_name, contract_record.client_name) || 
          ' (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
          case when days_until_expiry = 1 then ' dia' else ' dias' end,
          case 
            when days_until_expiry <= 3 then 'error'
            when days_until_expiry <= 7 then 'warning'
            else 'info'
          end,
          'contract',
          contract_record.id
        from user_roles ur
        where ur.role = 'admin'
        on conflict do nothing;
        
        if contract_record.user_id is not null then
          insert into notifications (user_id, title, description, type, reference_type, reference_id)
          values (
            contract_record.user_id,
            'Contrato próximo do vencimento',
            'Seu contrato (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
            case when days_until_expiry = 1 then ' dia' else ' dias' end,
            case 
              when days_until_expiry <= 3 then 'error'
              when days_until_expiry <= 7 then 'warning'
              else 'info'
            end,
            'contract',
            contract_record.id
          )
          on conflict do nothing;
        end if;
      end if;
    end if;
  end loop;
end;
$$;