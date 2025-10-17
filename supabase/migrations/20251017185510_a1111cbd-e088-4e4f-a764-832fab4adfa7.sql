-- Criar tabela de templates de credenciais
CREATE TABLE IF NOT EXISTS public.project_credential_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  category public.project_credential_category NOT NULL,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_credential_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage credential templates"
ON public.project_credential_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active credential templates"
ON public.project_credential_templates
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- Update trigger
CREATE TRIGGER update_project_credential_templates_updated_at
BEFORE UPDATE ON public.project_credential_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();