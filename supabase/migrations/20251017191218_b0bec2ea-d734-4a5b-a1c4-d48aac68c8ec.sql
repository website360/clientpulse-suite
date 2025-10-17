-- Create link templates table
CREATE TABLE IF NOT EXISTS public.project_link_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.project_link_category NOT NULL,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_link_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage link templates"
ON public.project_link_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active link templates"
ON public.project_link_templates
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- Update trigger
CREATE TRIGGER update_project_link_templates_updated_at
BEFORE UPDATE ON public.project_link_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();