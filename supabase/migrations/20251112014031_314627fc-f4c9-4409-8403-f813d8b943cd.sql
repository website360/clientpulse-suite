-- Inserir templates padrão para novos eventos de tickets
-- Esta migração insere os templates usando os valores de enum adicionados na migração anterior

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
  'Ticket Respondido por Admin',
  'Notificação enviada ao cliente quando um admin responde o ticket',
  'ticket_response_admin',
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel],
  'Resposta ao Ticket #{ticket_number}',
  E'Olá {client_name},\n\n{admin_name} respondeu ao seu ticket #{ticket_number}:\n\n"{message}"\n\nAcesse o sistema para continuar a conversa.',
  '["ticket_number", "client_name", "admin_name", "subject", "message", "ticket_url"]'::jsonb,
  true,
  true,
  false,
  false,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Ticket Respondido por Cliente',
  'Notificação enviada ao admin responsável quando o cliente responde',
  'ticket_response_client',
  ARRAY['email'::notification_channel, 'telegram'::notification_channel],
  'Nova Resposta - Ticket #{ticket_number}',
  E'O cliente {client_name} respondeu ao ticket #{ticket_number}:\n\n"{message}"\n\nAssunto: {subject}\n\nAcesse: {ticket_url}',
  '["ticket_number", "client_name", "contact_name", "subject", "message", "ticket_url"]'::jsonb,
  true,
  false,
  false,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Ticket Resolvido',
  'Notificação enviada quando um ticket é marcado como resolvido',
  'ticket_resolved',
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel, 'sms'::notification_channel],
  'Ticket #{ticket_number} Resolvido',
  E'Olá {client_name},\n\nSeu ticket #{ticket_number} foi resolvido!\n\nAssunto: {subject}\n\nResolução: {resolution_notes}\n\nSe o problema persistir, você pode reabrir o ticket.',
  '["ticket_number", "client_name", "subject", "resolved_by", "resolution_notes", "ticket_url"]'::jsonb,
  true,
  true,
  false,
  false,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Ticket Fechado',
  'Notificação enviada quando um ticket é fechado definitivamente',
  'ticket_closed',
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel],
  'Ticket #{ticket_number} Fechado',
  E'Olá {client_name},\n\nSeu ticket #{ticket_number} foi fechado.\n\nAssunto: {subject}\n\nObrigado por utilizar nossos serviços!\n\nCaso precise de ajuda novamente, abra um novo ticket.',
  '["ticket_number", "client_name", "subject", "closed_by", "ticket_url"]'::jsonb,
  true,
  true,
  false,
  false,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Ticket Reaberto',
  'Notificação enviada quando um ticket é reaberto',
  'ticket_reopened',
  ARRAY['email'::notification_channel, 'telegram'::notification_channel],
  'Ticket #{ticket_number} Reaberto',
  E'O ticket #{ticket_number} foi reaberto.\n\nCliente: {client_name}\nAssunto: {subject}\n\nMotivo: {reopen_reason}\n\nAcesse: {ticket_url}',
  '["ticket_number", "client_name", "subject", "reopened_by", "reopen_reason", "ticket_url"]'::jsonb,
  true,
  false,
  true,
  true,
  (SELECT id FROM auth.users LIMIT 1)
);