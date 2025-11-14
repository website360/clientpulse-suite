-- Seed notification templates for project approval events
-- Template 1: Approval Requested
INSERT INTO public.notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  template_html,
  variables,
  is_active,
  send_to_admins,
  send_to_client,
  send_to_assigned
)
SELECT 
  'Aprovação de Etapa Solicitada',
  'Solicitação de aprovação de etapa de projeto enviada ao cliente',
  'project_approval_requested'::public.notification_event_type,
  ARRAY['whatsapp','email']::public.notification_channel[],
  'Aprovação necessária: {{project_name}} — {{stage_name}}',
  'Olá {{client_name}},\n\nPrecisamos da sua aprovação para avançar na etapa "{{stage_name}}" do projeto "{{project_name}}".\n\nAcesse o link para aprovar: {{approval_url}}\n\nObservações: {{notes}}',
  '<h2>Aprovação necessária</h2>\n<p>Projeto: <strong>{{project_name}}</strong></p>\n<p>Etapa: <strong>{{stage_name}}</strong></p>\n<p>Por favor, <a href="{{approval_url}}">clique aqui para aprovar</a>.</p>\n<p>{{#if notes}}<em>Observações:</em> {{notes}}{{/if}}</p>',
  jsonb_build_object(
    'client_name','Nome do cliente',
    'client_email','Email do cliente',
    'client_phone','Telefone do cliente',
    'project_name','Nome do projeto',
    'stage_name','Nome da etapa',
    'approval_url','URL para aprovação',
    'notes','Observações adicionais'
  ),
  TRUE,
  FALSE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE event_type = 'project_approval_requested'::public.notification_event_type
);

-- Template 2: Approval Confirmed
INSERT INTO public.notification_templates (
  name,
  description,
  event_type,
  channels,
  template_subject,
  template_body,
  template_html,
  variables,
  is_active,
  send_to_admins,
  send_to_client,
  send_to_assigned
)
SELECT 
  'Aprovação Confirmada',
  'Confirmação de aprovação da etapa do projeto',
  'project_approval_confirmed'::public.notification_event_type,
  ARRAY['whatsapp','email']::public.notification_channel[],
  'Aprovação confirmada: {{project_name}} — {{stage_name}}',
  'Olá {{client_name}},\n\nRecebemos a aprovação da etapa "{{stage_name}}" do projeto "{{project_name}}".\nAprovado por: {{approved_by_name}}\n\nObrigado!',
  '<h2>Aprovação confirmada</h2>\n<p>Projeto: <strong>{{project_name}}</strong></p>\n<p>Etapa: <strong>{{stage_name}}</strong></p>\n<p>Aprovado por: <strong>{{approved_by_name}}</strong></p>',
  jsonb_build_object(
    'client_name','Nome do cliente',
    'client_email','Email do cliente',
    'client_phone','Telefone do cliente',
    'project_name','Nome do projeto',
    'stage_name','Nome da etapa',
    'approved_by_name','Nome de quem aprovou'
  ),
  TRUE,
  TRUE,   -- avisar admins
  TRUE,   -- e o cliente
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE event_type = 'project_approval_confirmed'::public.notification_event_type
);
