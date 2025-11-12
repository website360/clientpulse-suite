-- Tabela de configurações de notificações
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  telegram_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  quiet_hours_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, event_type)
);

-- Configurações globais (quando user_id é NULL)
CREATE INDEX idx_notification_settings_user ON public.notification_settings(user_id);
CREATE INDEX idx_notification_settings_event ON public.notification_settings(event_type);

-- RLS Policies
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e gerenciar configurações globais
CREATE POLICY "Admins can view all notification settings"
  ON public.notification_settings FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can insert notification settings"
  ON public.notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update notification settings"
  ON public.notification_settings FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can delete notification settings"
  ON public.notification_settings FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão para eventos principais
INSERT INTO public.notification_settings (user_id, event_type, email_enabled, telegram_enabled, sms_enabled, whatsapp_enabled)
VALUES 
  (NULL, 'ticket_created', true, true, false, true),
  (NULL, 'ticket_assigned', true, true, false, true),
  (NULL, 'ticket_response_admin', true, false, false, true),
  (NULL, 'ticket_response_client', true, true, false, true),
  (NULL, 'ticket_response_contact', true, true, false, true),
  (NULL, 'ticket_resolved', true, false, false, true),
  (NULL, 'ticket_closed', true, false, false, false),
  (NULL, 'ticket_reopened', true, true, false, true),
  (NULL, 'payment_received', true, false, false, false),
  (NULL, 'payment_due', true, false, true, true),
  (NULL, 'payment_overdue', true, false, true, true),
  (NULL, 'contract_expiring', true, false, false, true),
  (NULL, 'domain_expiring', true, false, false, true),
  (NULL, 'maintenance_scheduled', true, false, false, true),
  (NULL, 'maintenance_completed', true, false, false, true),
  (NULL, 'task_assigned', true, true, false, false),
  (NULL, 'task_due', true, true, false, false)
ON CONFLICT (user_id, event_type) DO NOTHING;