-- Corrigir trigger de notificação de ticket criado para incluir todos os dados necessários
CREATE OR REPLACE FUNCTION trigger_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_data jsonb;
  v_department_name text;
BEGIN
  -- Buscar dados do cliente
  SELECT jsonb_build_object(
    'client_name', COALESCE(c.company_name, c.full_name),
    'client_email', c.email,
    'client_phone', c.phone
  ) INTO v_client_data
  FROM clients c
  WHERE c.id = NEW.client_id;

  -- Buscar nome do departamento
  SELECT name INTO v_department_name
  FROM departments
  WHERE id = NEW.department_id;

  -- Enviar notificação com TODAS as variáveis necessárias
  PERFORM notify_event(
    'ticket_created',
    v_client_data || jsonb_build_object(
      'ticket_number', NEW.ticket_number,
      'subject', COALESCE(NEW.subject, 'Sem assunto'),
      'description', COALESCE(NEW.description, 'Sem descrição'),
      'department', COALESCE(v_department_name, 'Sem departamento'),
      'priority', CASE 
        WHEN NEW.priority = 'low' THEN 'Baixa'
        WHEN NEW.priority = 'medium' THEN 'Média'
        WHEN NEW.priority = 'high' THEN 'Alta'
        WHEN NEW.priority = 'urgent' THEN 'Urgente'
        ELSE 'Média'
      END,
      'created_at', TO_CHAR(NEW.created_at, 'DD/MM/YYYY às HH24:MI'),
      'ticket_url', 'https://sistema.com/tickets/' || NEW.id
    ),
    'ticket',
    NEW.id
  );

  RETURN NEW;
END;
$$;