-- Criar templates padrão para lembretes de aprovação
INSERT INTO notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  send_to_client,
  send_to_admins,
  created_by,
  is_active
)
SELECT
  'Lembrete de Aprovação - Urgência Normal',
  'Enviado quando uma aprovação está pendente há alguns dias',
  'approval_reminder_normal'::notification_event_type,
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel],
  'Lembrete: Aprovação Pendente - {{project_name}}',
  E'Olá {{client_name}},\n\nEste é um lembrete amigável sobre a aprovação pendente da etapa "{{stage_name}}" do projeto {{project_name}}.\n\n📅 Pendente há: {{days_pending}} dias\n\nPara aprovar, acesse: {{approval_url}}\n\nSe tiver alguma dúvida, estamos à disposição!\n\nAtenciosamente,\nEquipe',
  true,
  false,
  (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates 
  WHERE event_type = 'approval_reminder_normal'::notification_event_type
);

INSERT INTO notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  send_to_client,
  send_to_admins,
  created_by,
  is_active
)
SELECT
  'Lembrete de Aprovação - Urgência Média',
  'Enviado quando uma aprovação está pendente há mais tempo',
  'approval_reminder_medium'::notification_event_type,
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel],
  '⚠️ Atenção: Aprovação Pendente - {{project_name}}',
  E'Olá {{client_name}},\n\n⚠️ Notamos que a aprovação da etapa "{{stage_name}}" do projeto {{project_name}} ainda está pendente.\n\n📅 Pendente há: {{days_pending}} dias\n\nPara dar continuidade ao projeto, precisamos da sua aprovação. Acesse: {{approval_url}}\n\nCaso precise de mais informações ou esclarecimentos, entre em contato conosco.\n\nAtenciosamente,\nEquipe',
  true,
  false,
  (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates 
  WHERE event_type = 'approval_reminder_medium'::notification_event_type
);

INSERT INTO notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  send_to_client,
  send_to_admins,
  created_by,
  is_active
)
SELECT
  'Lembrete de Aprovação - Urgência Alta',
  'Enviado quando uma aprovação está pendente há muito tempo',
  'approval_reminder_high'::notification_event_type,
  ARRAY['email'::notification_channel, 'whatsapp'::notification_channel],
  '🚨 URGENTE: Aprovação Necessária - {{project_name}}',
  E'Olá {{client_name}},\n\n🚨 URGENTE: A aprovação da etapa "{{stage_name}}" do projeto {{project_name}} está pendente há {{days_pending}} dias.\n\n⚠️ A falta de aprovação pode impactar o cronograma e prazos do projeto.\n\nPor favor, aprove o mais rápido possível: {{approval_url}}\n\nSe houver algum problema ou dúvida que esteja impedindo a aprovação, entre em contato URGENTEMENTE.\n\nAtenciosamente,\nEquipe',
  true,
  true,
  (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates 
  WHERE event_type = 'approval_reminder_high'::notification_event_type
);

-- Criar configurações padrão para os novos eventos
INSERT INTO notification_settings (
  event_type,
  email_enabled,
  telegram_enabled,
  sms_enabled,
  whatsapp_enabled,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
)
SELECT 
  'approval_reminder_normal',
  true,
  false,
  false,
  true,
  true,
  '22:00:00'::time,
  '08:00:00'::time
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings 
  WHERE event_type = 'approval_reminder_normal'
);

INSERT INTO notification_settings (
  event_type,
  email_enabled,
  telegram_enabled,
  sms_enabled,
  whatsapp_enabled,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
)
SELECT 
  'approval_reminder_medium',
  true,
  false,
  false,
  true,
  true,
  '22:00:00'::time,
  '08:00:00'::time
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings 
  WHERE event_type = 'approval_reminder_medium'
);

INSERT INTO notification_settings (
  event_type,
  email_enabled,
  telegram_enabled,
  sms_enabled,
  whatsapp_enabled,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
)
SELECT 
  'approval_reminder_high',
  true,
  true,
  true,
  true,
  false,
  '22:00:00'::time,
  '08:00:00'::time
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings 
  WHERE event_type = 'approval_reminder_high'
);