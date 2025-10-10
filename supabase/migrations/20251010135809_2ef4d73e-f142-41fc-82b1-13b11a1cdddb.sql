-- Função para criar notificação de nova mensagem
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  recipient_user_id UUID;
BEGIN
  -- Buscar informações do ticket
  SELECT t.*, c.user_id as client_user_id
  INTO ticket_record
  FROM tickets t
  JOIN clients c ON c.id = t.client_id
  WHERE t.id = NEW.ticket_id;

  -- Se a mensagem foi enviada pelo cliente, notificar admin/assigned
  -- Se foi enviada por admin, notificar o cliente
  IF NEW.user_id = ticket_record.client_user_id THEN
    -- Mensagem do cliente - notificar admin ou técnico atribuído
    IF ticket_record.assigned_to IS NOT NULL THEN
      recipient_user_id := ticket_record.assigned_to;
    ELSE
      -- Notificar todos os admins se não há técnico atribuído
      INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
      SELECT ur.user_id, 
             'Nova mensagem no ticket #' || ticket_record.ticket_number,
             'Uma nova mensagem foi adicionada ao ticket: ' || ticket_record.subject,
             'info',
             'ticket',
             ticket_record.id
      FROM user_roles ur
      WHERE ur.role = 'admin';
      
      RETURN NEW;
    END IF;
  ELSE
    -- Mensagem de admin/técnico - notificar o cliente
    recipient_user_id := ticket_record.client_user_id;
  END IF;

  -- Criar notificação para o destinatário específico
  IF recipient_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
    VALUES (
      recipient_user_id,
      'Nova mensagem no ticket #' || ticket_record.ticket_number,
      'Uma nova mensagem foi adicionada ao ticket: ' || ticket_record.subject,
      'info',
      'ticket',
      ticket_record.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para nova mensagem
DROP TRIGGER IF EXISTS trigger_notify_new_message ON ticket_messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Função para notificar criação de ticket
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar todos os admins sobre novo ticket
  INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
  SELECT ur.user_id,
         'Novo ticket criado #' || NEW.ticket_number,
         'Um novo ticket foi criado: ' || NEW.subject,
         'info',
         'ticket',
         NEW.id
  FROM user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

-- Trigger para criação de ticket
DROP TRIGGER IF EXISTS trigger_notify_ticket_created ON tickets;
CREATE TRIGGER trigger_notify_ticket_created
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_created();

-- Função para notificar mudança de status
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  status_label TEXT;
BEGIN
  -- Apenas notificar se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Buscar o user_id do cliente
    SELECT c.user_id INTO client_user_id
    FROM clients c
    WHERE c.id = NEW.client_id;

    -- Mapear status para label em português
    status_label := CASE NEW.status
      WHEN 'open' THEN 'Aberto'
      WHEN 'in_progress' THEN 'Em Andamento'
      WHEN 'waiting' THEN 'Aguardando'
      WHEN 'resolved' THEN 'Resolvido'
      WHEN 'closed' THEN 'Fechado'
      ELSE NEW.status
    END;

    -- Notificar o cliente
    IF client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
      VALUES (
        client_user_id,
        'Status do ticket #' || NEW.ticket_number || ' alterado',
        'O status do seu ticket foi alterado para: ' || status_label,
        CASE NEW.status
          WHEN 'resolved' THEN 'success'
          WHEN 'closed' THEN 'success'
          ELSE 'info'
        END,
        'ticket',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para mudança de status
DROP TRIGGER IF EXISTS trigger_notify_ticket_status_changed ON tickets;
CREATE TRIGGER trigger_notify_ticket_status_changed
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_status_changed();
