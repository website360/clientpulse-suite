-- Criar função para formatar data no timezone de Brasília
CREATE OR REPLACE FUNCTION format_timestamp_br(ts TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TO_CHAR(ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI');
END;
$$;

-- Atualizar trigger para usar timezone correto
CREATE OR REPLACE FUNCTION public.trigger_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'created_at', format_timestamp_br(NEW.created_at),
      'ticket_url', 'https://sistema.com/tickets/' || NEW.id
    ),
    'ticket',
    NEW.id
  );

  RETURN NEW;
END;
$$;