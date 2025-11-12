-- Tabela de audit logs para rastreabilidade (somente se não existir)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas (somente se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_user_id') THEN
    CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_table_name') THEN
    CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_action') THEN
    CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_created_at') THEN
    CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_record_id') THEN
    CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
  END IF;
END $$;

-- RLS para audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'Admins can view all audit logs'
  ) THEN
    CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Continua com as outras tabelas...
CREATE TABLE IF NOT EXISTS public.system_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.system_modules (name, description) VALUES
  ('dashboard', 'Dashboard e métricas'),
  ('clients', 'Gestão de clientes'),
  ('tickets', 'Sistema de tickets'),
  ('financial', 'Módulo financeiro'),
  ('projects', 'Gestão de projetos'),
  ('contracts', 'Contratos'),
  ('domains', 'Gestão de domínios'),
  ('maintenance', 'Manutenções'),
  ('tasks', 'Tarefas'),
  ('notes', 'Notas'),
  ('knowledge_base', 'Base de conhecimento'),
  ('reports', 'Relatórios'),
  ('settings', 'Configurações')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, action)
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_permissions_module_id') THEN
    CREATE INDEX idx_permissions_module_id ON public.permissions(module_id);
  END IF;
END $$;

INSERT INTO public.permissions (module_id, action, description, requires_approval)
SELECT 
  m.id,
  actions.action,
  actions.description,
  actions.requires_approval
FROM public.system_modules m
CROSS JOIN (
  VALUES 
    ('view', 'Visualizar registros', false),
    ('create', 'Criar novos registros', false),
    ('update', 'Atualizar registros', false),
    ('delete', 'Excluir registros', true),
    ('export', 'Exportar dados', false)
) AS actions(action, description, requires_approval)
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (module_id, action, description, requires_approval)
SELECT 
  m.id,
  actions.action,
  actions.description,
  actions.requires_approval
FROM public.system_modules m
CROSS JOIN (
  VALUES 
    ('approve_payment', 'Aprovar pagamentos', true),
    ('cancel_payment', 'Cancelar pagamentos', true),
    ('view_reports', 'Visualizar relatórios financeiros', false)
) AS actions(action, description, requires_approval)
WHERE m.name = 'financial'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_role_permissions_role_id') THEN
    CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_role_permissions_permission_id') THEN
    CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_custom_roles_user_id') THEN
    CREATE INDEX idx_user_custom_roles_user_id ON public.user_custom_roles(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_custom_roles_role_id') THEN
    CREATE INDEX idx_user_custom_roles_role_id ON public.user_custom_roles(role_id);
  END IF;
END $$;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_roles' AND policyname = 'Admins can manage custom roles') THEN
    CREATE POLICY "Admins can manage custom roles" ON public.custom_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'Admins can manage role permissions') THEN
    CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_custom_roles' AND policyname = 'Admins can manage user custom roles') THEN
    CREATE POLICY "Admins can manage user custom roles" ON public.user_custom_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_custom_roles' AND policyname = 'Users can view their own custom roles') THEN
    CREATE POLICY "Users can view their own custom roles" ON public.user_custom_roles FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_user_id') THEN
    CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_session_token') THEN
    CREATE INDEX idx_user_sessions_session_token ON public.user_sessions(session_token);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_expires_at') THEN
    CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
  END IF;
END $$;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Users can view their own sessions') THEN
    CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Users can delete their own sessions') THEN
    CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Admins can view all sessions') THEN
    CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pending_approvals_user_id') THEN
    CREATE INDEX idx_pending_approvals_user_id ON public.pending_approvals(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pending_approvals_status') THEN
    CREATE INDEX idx_pending_approvals_status ON public.pending_approvals(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pending_approvals_requested_at') THEN
    CREATE INDEX idx_pending_approvals_requested_at ON public.pending_approvals(requested_at DESC);
  END IF;
END $$;

ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_approvals' AND policyname = 'Users can view their own approval requests') THEN
    CREATE POLICY "Users can view their own approval requests" ON public.pending_approvals FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_approvals' AND policyname = 'Users can create approval requests') THEN
    CREATE POLICY "Users can create approval requests" ON public.pending_approvals FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_approvals' AND policyname = 'Admins can review approvals') THEN
    CREATE POLICY "Admins can review approvals" ON public.pending_approvals FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _module_name TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_id = ucr.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_modules m ON m.id = p.module_id
    WHERE ucr.user_id = _user_id
      AND m.name = _module_name
      AND p.action = _action
      AND m.is_active = true
  );
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_modules_updated_at') THEN
    CREATE TRIGGER update_system_modules_updated_at
    BEFORE UPDATE ON public.system_modules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_roles_updated_at') THEN
    CREATE TRIGGER update_custom_roles_updated_at
    BEFORE UPDATE ON public.custom_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;