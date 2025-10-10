-- Atualizar função para verificar contratos vencidos/a vencer e gerenciar notificações
CREATE OR REPLACE FUNCTION public.check_expiring_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contract_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  -- Primeiro, normalizar status dos contratos baseado na end_date
  UPDATE public.contracts c
  SET status = CASE
      WHEN c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE THEN 'expired'
      WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '44 days' THEN 'expiring'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE c.end_date IS NOT NULL
    AND (
      (c.status IS DISTINCT FROM 'expired' AND c.end_date < CURRENT_DATE)
      OR (c.status IS DISTINCT FROM 'expiring' AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '44 days')
      OR (c.status IS DISTINCT FROM 'active' AND (c.end_date > CURRENT_DATE + INTERVAL '44 days'))
    );

  -- Limpar notificações de contratos que não estão mais vencidos ou a vencer
  UPDATE public.notifications
  SET read = TRUE
  WHERE reference_type = 'contract'
    AND read = FALSE
    AND reference_id IN (
      SELECT c.id
      FROM public.contracts c
      WHERE c.status NOT IN ('expired', 'expiring')
    );

  -- Verificar contratos vencendo em 30, 15, 7, 3, e 1 dia(s)
  FOR contract_record IN
    SELECT 
      c.id,
      c.end_date,
      c.client_id,
      cl.full_name AS client_name,
      cl.nickname,
      cl.company_name,
      s.name AS service_name,
      p.id AS user_id
    FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    JOIN services s ON c.service_id = s.id
    LEFT JOIN profiles p ON cl.user_id = p.id
    WHERE c.end_date IS NOT NULL
      AND c.end_date > CURRENT_DATE
      AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND c.status IN ('active','expiring')
  LOOP
    days_until_expiry := contract_record.end_date - CURRENT_DATE;
    
    IF days_until_expiry IN (30, 15, 7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE reference_type = 'contract'
          AND reference_id = contract_record.id
          AND created_at::date = CURRENT_DATE
          AND description LIKE '%' || days_until_expiry || ' dia%'
      ) THEN
        -- Notificar admins
        INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
        SELECT 
          ur.user_id,
          'Contrato próximo do vencimento',
          'O contrato de ' || COALESCE(contract_record.nickname, contract_record.company_name, contract_record.client_name) || 
          ' (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
          CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
          CASE 
            WHEN days_until_expiry <= 3 THEN 'error'
            WHEN days_until_expiry <= 7 THEN 'warning'
            ELSE 'info'
          END,
          'contract',
          contract_record.id
        FROM user_roles ur
        WHERE ur.role = 'admin'
        ON CONFLICT DO NOTHING;
        
        -- Notificar cliente se tiver user_id
        IF contract_record.user_id IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
          VALUES (
            contract_record.user_id,
            'Contrato próximo do vencimento',
            'Seu contrato (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
            CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
            CASE 
              WHEN days_until_expiry <= 3 THEN 'error'
              WHEN days_until_expiry <= 7 THEN 'warning'
              ELSE 'info'
            END,
            'contract',
            contract_record.id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Atualizar função para verificar domínios vencidos/a vencer e gerenciar notificações
CREATE OR REPLACE FUNCTION public.check_expiring_domains()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  domain_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  -- Limpar notificações de domínios que não estão mais vencidos ou a vencer (mais de 30 dias)
  UPDATE public.notifications
  SET read = TRUE
  WHERE reference_type = 'domain'
    AND read = FALSE
    AND reference_id IN (
      SELECT d.id
      FROM public.domains d
      WHERE d.expires_at > CURRENT_DATE + INTERVAL '30 days'
        OR d.expires_at <= CURRENT_DATE
    );

  -- Verificar domínios vencendo em 30, 15, 7, 3, e 1 dia(s)
  FOR domain_record IN
    SELECT 
      d.id,
      d.domain,
      d.expires_at,
      d.client_id,
      cl.full_name AS client_name,
      cl.nickname,
      cl.company_name,
      p.id AS user_id
    FROM domains d
    JOIN clients cl ON d.client_id = cl.id
    LEFT JOIN profiles p ON cl.user_id = p.id
    WHERE d.expires_at > CURRENT_DATE
      AND d.expires_at <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    days_until_expiry := domain_record.expires_at - CURRENT_DATE;
    
    IF days_until_expiry IN (30, 15, 7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE reference_type = 'domain'
          AND reference_id = domain_record.id
          AND created_at::date = CURRENT_DATE
          AND description LIKE '%' || days_until_expiry || ' dia%'
      ) THEN
        -- Notificar admins
        INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
        SELECT 
          ur.user_id,
          'Domínio próximo do vencimento',
          'O domínio ' || domain_record.domain || ' de ' || 
          COALESCE(domain_record.nickname, domain_record.company_name, domain_record.client_name) || 
          ' vence em ' || days_until_expiry || 
          CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
          CASE 
            WHEN days_until_expiry <= 3 THEN 'error'
            WHEN days_until_expiry <= 7 THEN 'warning'
            ELSE 'info'
          END,
          'domain',
          domain_record.id
        FROM user_roles ur
        WHERE ur.role = 'admin'
        ON CONFLICT DO NOTHING;
        
        -- Notificar cliente se tiver user_id
        IF domain_record.user_id IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
          VALUES (
            domain_record.user_id,
            'Domínio próximo do vencimento',
            'Seu domínio ' || domain_record.domain || ' vence em ' || days_until_expiry || 
            CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
            CASE 
              WHEN days_until_expiry <= 3 THEN 'error'
              WHEN days_until_expiry <= 7 THEN 'warning'
              ELSE 'info'
            END,
            'domain',
            domain_record.id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;