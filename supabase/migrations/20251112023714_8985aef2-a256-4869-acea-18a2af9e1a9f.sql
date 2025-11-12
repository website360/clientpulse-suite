-- Adicionar coluna para template HTML em emails
ALTER TABLE notification_templates 
ADD COLUMN template_html TEXT;