-- Criar tabela para configurações do Google Calendar
CREATE TABLE IF NOT EXISTS public.google_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar configurações do Google
CREATE POLICY "Admins can manage google calendar settings"
ON public.google_calendar_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_google_calendar_settings_updated_at
  BEFORE UPDATE ON public.google_calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();