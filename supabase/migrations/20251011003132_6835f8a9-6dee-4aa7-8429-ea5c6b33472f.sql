-- Popular banco de dados com 150 registros de cada tipo
DO $$
DECLARE
  admin_user_id UUID;
  client_ids UUID[];
  supplier_ids UUID[];
  department_ids UUID[];
  service_ids UUID[];
  payment_method_ids UUID[];
  category_payable_ids UUID[];
  category_receivable_ids UUID[];
  i INTEGER;
  ts BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT; -- Timestamp único
BEGIN
  -- Buscar um usuário admin existente
  SELECT user_id INTO admin_user_id FROM user_roles WHERE role = 'admin' LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário admin encontrado. Execute este script após criar um usuário admin.';
    RETURN;
  END IF;

  -- Criar departamentos se não existirem
  INSERT INTO departments (name, description, color, is_active)
  VALUES 
    ('Suporte Técnico', 'Departamento de suporte técnico', '#3B82F6', true),
    ('Desenvolvimento', 'Departamento de desenvolvimento', '#10B981', true),
    ('Design', 'Departamento de design', '#8B5CF6', true),
    ('Marketing', 'Departamento de marketing', '#F59E0B', true),
    ('Financeiro', 'Departamento financeiro', '#EF4444', true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO department_ids FROM departments WHERE is_active = true LIMIT 5;

  -- Criar serviços se não existirem
  INSERT INTO services (name, description, created_by, is_active)
  VALUES 
    ('Hospedagem Web', 'Serviço de hospedagem de sites', admin_user_id, true),
    ('Manutenção de Site', 'Serviço mensal de manutenção', admin_user_id, true),
    ('Desenvolvimento Custom', 'Desenvolvimento personalizado', admin_user_id, true),
    ('Consultoria', 'Consultoria em TI', admin_user_id, true),
    ('Suporte Técnico', 'Suporte técnico mensal', admin_user_id, true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO service_ids FROM services WHERE is_active = true LIMIT 5;

  -- Criar fornecedores se não existirem
  INSERT INTO suppliers (name, link, created_by, is_active)
  VALUES 
    ('AWS Brasil', 'https://aws.amazon.com', admin_user_id, true),
    ('Google Cloud', 'https://cloud.google.com', admin_user_id, true),
    ('Microsoft Azure', 'https://azure.microsoft.com', admin_user_id, true),
    ('DigitalOcean', 'https://digitalocean.com', admin_user_id, true),
    ('Cloudflare', 'https://cloudflare.com', admin_user_id, true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO supplier_ids FROM suppliers WHERE is_active = true LIMIT 5;

  -- Criar métodos de pagamento se não existirem
  INSERT INTO payment_methods (name, is_active)
  VALUES 
    ('PIX', true),
    ('Boleto', true),
    ('Cartão de Crédito', true),
    ('Transferência Bancária', true),
    ('Dinheiro', true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO payment_method_ids FROM payment_methods WHERE is_active = true LIMIT 5;

  -- Criar categorias de pagamento
  INSERT INTO payment_categories (name, type, is_active)
  VALUES 
    ('Hospedagem', 'payable', true),
    ('Software', 'payable', true),
    ('Infraestrutura', 'payable', true),
    ('Serviços', 'payable', true),
    ('Outros', 'payable', true),
    ('Mensalidade', 'receivable', true),
    ('Projeto', 'receivable', true),
    ('Consultoria', 'receivable', true),
    ('Suporte', 'receivable', true),
    ('Licença', 'receivable', true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO category_payable_ids FROM payment_categories WHERE type = 'payable' AND is_active = true LIMIT 5;
  SELECT ARRAY_AGG(id) INTO category_receivable_ids FROM payment_categories WHERE type = 'receivable' AND is_active = true LIMIT 5;

  -- Criar 150 clientes com CPF/CNPJ únicos baseados em timestamp
  FOR i IN 1..150 LOOP
    INSERT INTO clients (
      client_type,
      full_name,
      company_name,
      nickname,
      email,
      phone,
      cpf_cnpj,
      address_cep,
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state,
      is_active,
      created_by
    )
    VALUES (
      (CASE WHEN i % 2 = 0 THEN 'company' ELSE 'person' END)::client_type,
      CASE WHEN i % 2 = 1 THEN 'Cliente ' || i || ' da Silva' ELSE NULL END,
      CASE WHEN i % 2 = 0 THEN 'Empresa ' || i || ' LTDA' ELSE NULL END,
      'Cliente ' || i,
      'cliente' || ts || i || '@example.com',
      '11' || LPAD((ts + i)::TEXT, 9, '9'),
      SUBSTRING((ts + i * 1000)::TEXT, 1, CASE WHEN i % 2 = 0 THEN 14 ELSE 11 END),
      LPAD((ts + i)::TEXT, 8, '0'),
      'Rua Exemplo ' || i,
      i::TEXT,
      'Centro',
      'São Paulo',
      'SP',
      true,
      admin_user_id
    );
  END LOOP;

  SELECT ARRAY_AGG(id ORDER BY created_at DESC) INTO client_ids FROM (SELECT id, created_at FROM clients ORDER BY created_at DESC LIMIT 150) sub;

  -- Criar 150 contratos
  FOR i IN 1..150 LOOP
    INSERT INTO contracts (
      client_id,
      service_id,
      amount,
      payment_method_id,
      payment_terms,
      status,
      start_date,
      end_date,
      created_by
    )
    VALUES (
      client_ids[((i - 1) % ARRAY_LENGTH(client_ids, 1)) + 1],
      service_ids[((i - 1) % ARRAY_LENGTH(service_ids, 1)) + 1],
      (500 + (i * 50))::NUMERIC,
      payment_method_ids[((i - 1) % ARRAY_LENGTH(payment_method_ids, 1)) + 1],
      'Pagamento até dia 10',
      CASE 
        WHEN i % 4 = 0 THEN 'expired'
        WHEN i % 4 = 1 THEN 'completed'
        WHEN i % 4 = 2 THEN 'active'
        ELSE 'pending_signature'
      END,
      CURRENT_DATE - INTERVAL '1 year' * (i % 3),
      CURRENT_DATE + INTERVAL '1 year' - INTERVAL '1 month' * (i % 12),
      admin_user_id
    );
  END LOOP;

  -- Criar 150 domínios
  FOR i IN 1..150 LOOP
    INSERT INTO domains (
      client_id,
      domain,
      expires_at,
      owner,
      created_by
    )
    VALUES (
      client_ids[((i - 1) % ARRAY_LENGTH(client_ids, 1)) + 1],
      'cliente' || ts || i || '-example.com',
      CURRENT_DATE + INTERVAL '1 year' - INTERVAL '1 month' * (i % 12),
      (CASE WHEN i % 2 = 0 THEN 'agency' ELSE 'client' END)::domain_owner,
      admin_user_id
    );
  END LOOP;

  -- Criar 150 tickets
  FOR i IN 1..150 LOOP
    INSERT INTO tickets (
      client_id,
      department_id,
      subject,
      description,
      priority,
      status,
      created_by,
      assigned_to
    )
    VALUES (
      client_ids[((i - 1) % ARRAY_LENGTH(client_ids, 1)) + 1],
      department_ids[((i - 1) % ARRAY_LENGTH(department_ids, 1)) + 1],
      'Ticket #' || i || ' - Solicitação de Suporte',
      'Descrição detalhada do ticket ' || i || '. Cliente precisa de ajuda com seu sistema.',
      (CASE 
        WHEN i % 4 = 0 THEN 'urgent'
        WHEN i % 4 = 1 THEN 'high'
        WHEN i % 4 = 2 THEN 'medium'
        ELSE 'low'
      END)::ticket_priority,
      (CASE 
        WHEN i % 5 = 0 THEN 'closed'
        WHEN i % 5 = 1 THEN 'resolved'
        WHEN i % 5 = 2 THEN 'waiting'
        WHEN i % 5 = 3 THEN 'in_progress'
        ELSE 'open'
      END)::ticket_status,
      admin_user_id,
      admin_user_id
    );
  END LOOP;

  -- Criar 150 contas a pagar
  FOR i IN 1..150 LOOP
    INSERT INTO accounts_payable (
      supplier_id,
      description,
      category,
      amount,
      due_date,
      status,
      payment_method,
      occurrence_type,
      created_by
    )
    VALUES (
      supplier_ids[((i - 1) % ARRAY_LENGTH(supplier_ids, 1)) + 1],
      'Pagamento ' || i || ' - Fornecedor',
      (SELECT name FROM payment_categories WHERE id = category_payable_ids[((i - 1) % ARRAY_LENGTH(category_payable_ids, 1)) + 1]),
      (100 + (i * 25))::NUMERIC,
      CURRENT_DATE - INTERVAL '1 month' + INTERVAL '1 day' * (i % 90),
      (CASE 
        WHEN i % 4 = 0 THEN 'paid'
        WHEN i % 4 = 1 THEN 'overdue'
        WHEN i % 4 = 2 THEN 'canceled'
        ELSE 'pending'
      END)::payment_status,
      (SELECT name FROM payment_methods WHERE id = payment_method_ids[((i - 1) % ARRAY_LENGTH(payment_method_ids, 1)) + 1]),
      'unica',
      admin_user_id
    );
  END LOOP;

  -- Criar 150 contas a receber
  FOR i IN 1..150 LOOP
    INSERT INTO accounts_receivable (
      client_id,
      description,
      category,
      amount,
      due_date,
      status,
      payment_method,
      occurrence_type,
      created_by
    )
    VALUES (
      client_ids[((i - 1) % ARRAY_LENGTH(client_ids, 1)) + 1],
      'Recebimento ' || i || ' - Cliente',
      (SELECT name FROM payment_categories WHERE id = category_receivable_ids[((i - 1) % ARRAY_LENGTH(category_receivable_ids, 1)) + 1]),
      (200 + (i * 35))::NUMERIC,
      CURRENT_DATE - INTERVAL '1 month' + INTERVAL '1 day' * (i % 90),
      (CASE 
        WHEN i % 4 = 0 THEN 'received'
        WHEN i % 4 = 1 THEN 'overdue'
        WHEN i % 4 = 2 THEN 'canceled'
        ELSE 'pending'
      END)::payment_status,
      (SELECT name FROM payment_methods WHERE id = payment_method_ids[((i - 1) % ARRAY_LENGTH(payment_method_ids, 1)) + 1]),
      'unica',
      admin_user_id
    );
  END LOOP;

  RAISE NOTICE 'Banco de dados populado com sucesso! 150 registros de cada tipo foram criados.';
END $$;