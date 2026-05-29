-- ============================================================================
-- Notas internas em tickets (visíveis apenas para a equipe/admin)
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run.
-- Idempotente: pode rodar mais de uma vez sem problema.
-- ============================================================================

-- 1) RLS: clientes/contatos NÃO podem ler mensagens internas.
--    Admin continua vendo tudo. Mantém o restante da regra original.
DROP POLICY IF EXISTS "Users can view messages of their tickets" ON public.ticket_messages;

CREATE POLICY "Users can view messages of their tickets"
  ON public.ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND (
        tickets.created_by = auth.uid() OR
        tickets.assigned_to = auth.uid() OR
        EXISTS (SELECT 1 FROM public.clients WHERE clients.id = tickets.client_id AND clients.user_id = auth.uid()) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
    AND (
      public.has_role(auth.uid(), 'admin')
      OR ticket_messages.is_internal IS NOT TRUE
    )
  );

-- 2) Triggers de notificação/e-mail/WhatsApp e SLA NÃO devem disparar para
--    notas internas (evita avisar o cliente e contar como 1ª resposta no SLA).
--    Recriamos só os gatilhos com WHEN; as funções não são alteradas.

-- 2a) Notificação in-app
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.ticket_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  WHEN (NEW.is_internal IS NOT TRUE)
  EXECUTE FUNCTION public.notify_new_message();

-- 2b) E-mail de nova mensagem
DROP TRIGGER IF EXISTS trigger_notify_new_message_email ON public.ticket_messages;
CREATE TRIGGER trigger_notify_new_message_email
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  WHEN (NEW.is_internal IS NOT TRUE)
  EXECUTE FUNCTION public.notify_new_message_email();

-- 2c) WhatsApp / resposta do ticket
DROP TRIGGER IF EXISTS on_ticket_response ON public.ticket_messages;
CREATE TRIGGER on_ticket_response
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  WHEN (NEW.is_internal IS NOT TRUE)
  EXECUTE FUNCTION public.trigger_ticket_response();

-- 2d) Tempo de 1ª resposta (SLA) — nota interna não conta como resposta ao cliente
DROP TRIGGER IF EXISTS trigger_update_ticket_response_time ON public.ticket_messages;
CREATE TRIGGER trigger_update_ticket_response_time
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  WHEN (NEW.is_internal IS NOT TRUE)
  EXECUTE FUNCTION public.update_ticket_response_time();
