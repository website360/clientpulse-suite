-- Add new columns to ticket_macros table for message templates
ALTER TABLE ticket_macros
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'text' CHECK (channel IN ('text', 'email', 'whatsapp', 'both')),
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_html TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_template TEXT,
ADD COLUMN IF NOT EXISTS template_category VARCHAR(50) DEFAULT 'custom' CHECK (template_category IN ('custom', 'ticket_opened', 'ticket_reply', 'ticket_closed', 'ticket_feedback', 'payment_reminder', 'service_notification'));

-- Add comment to explain the new fields
COMMENT ON COLUMN ticket_macros.channel IS 'Canal de comunicação: text (texto simples), email, whatsapp, ou both (email + whatsapp)';
COMMENT ON COLUMN ticket_macros.email_subject IS 'Assunto do email (apenas para canal email)';
COMMENT ON COLUMN ticket_macros.email_html IS 'Template HTML do email';
COMMENT ON COLUMN ticket_macros.whatsapp_template IS 'Template de mensagem para WhatsApp';
COMMENT ON COLUMN ticket_macros.template_category IS 'Categoria do template para organização';
