-- Habilitar RLS nas tabelas que estavam faltando
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Policies para system_modules
CREATE POLICY "Everyone can view active modules"
ON public.system_modules
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage modules"
ON public.system_modules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para permissions
CREATE POLICY "Admins can view all permissions"
ON public.permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage permissions"
ON public.permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));