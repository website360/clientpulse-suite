-- Criar tabela para salvar configurações de dashboards personalizados
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_dashboard_configs_user_id ON public.dashboard_configs(user_id);
CREATE INDEX idx_dashboard_configs_is_default ON public.dashboard_configs(user_id, is_default);

-- RLS Policies
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios dashboards
CREATE POLICY "Users can view their own dashboards"
  ON public.dashboard_configs
  FOR SELECT
  USING (user_id = auth.uid() OR is_shared = true);

-- Usuários podem criar seus próprios dashboards
CREATE POLICY "Users can create their own dashboards"
  ON public.dashboard_configs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar seus próprios dashboards
CREATE POLICY "Users can update their own dashboards"
  ON public.dashboard_configs
  FOR UPDATE
  USING (user_id = auth.uid());

-- Usuários podem deletar seus próprios dashboards
CREATE POLICY "Users can delete their own dashboards"
  ON public.dashboard_configs
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins podem ver todos os dashboards
CREATE POLICY "Admins can view all dashboards"
  ON public.dashboard_configs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();