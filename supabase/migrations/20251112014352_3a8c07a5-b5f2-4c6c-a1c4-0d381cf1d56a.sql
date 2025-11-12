-- Inserir template padrão para resposta de contato
INSERT INTO notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  variables,
  is_active,
  send_to_client,
  send_to_admins,
  send_to_assigned,
  created_by
) VALUES
(
  'Ticket Respondido por Contato',
  'Notificação enviada ao admin responsável quando um contato do cliente responde',
  'ticket_response_contact',
  ARRAY['email'::notification_channel, 'telegram'::notification_channel],
  'Nova Resposta - Ticket #{ticket_number}',
  E'O contato {contact_name} da empresa {client_name} respondeu ao ticket #{ticket_number}:\n\n"{message}"\n\nAssunto: {subject}\n\nAcesse: {ticket_url}',
  '["ticket_number", "client_name", "contact_name", "subject", "message", "ticket_url"]'::jsonb,
  true,
  false,
  false,
  true,
  (SELECT id FROM auth.users LIMIT 1)
);