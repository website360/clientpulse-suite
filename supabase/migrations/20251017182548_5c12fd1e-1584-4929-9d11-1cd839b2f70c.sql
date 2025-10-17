-- Create enums
CREATE TYPE project_status AS ENUM ('planejamento', 'em_andamento', 'aguardando_aprovacao', 'concluido', 'cancelado');
CREATE TYPE project_stage_status AS ENUM ('pendente', 'em_andamento', 'concluida');
CREATE TYPE project_link_category AS ENUM ('google_drive', 'images', 'identity', 'copy', 'prototype', 'documentation', 'other');
CREATE TYPE project_credential_category AS ENUM ('hosting', 'cloudflare', 'domain_registry', 'cms', 'ftp', 'database', 'api', 'email', 'other');

-- Create project_types table
CREATE TABLE public.project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1E40AF',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_stage_templates table
CREATE TABLE public.project_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id UUID REFERENCES public.project_types(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_checklist_templates table
CREATE TABLE public.project_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_template_id UUID REFERENCES public.project_stage_templates(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  approval_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  project_type_id UUID REFERENCES public.project_types(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'planejamento' NOT NULL,
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  project_value NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_stages table
CREATE TABLE public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  stage_template_id UUID REFERENCES public.project_stage_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  status project_stage_status DEFAULT 'pendente' NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_checklist_items table
CREATE TABLE public.project_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID REFERENCES public.project_stages(id) ON DELETE CASCADE NOT NULL,
  checklist_template_id UUID REFERENCES public.project_checklist_templates(id),
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  requires_approval BOOLEAN DEFAULT false,
  approval_type TEXT,
  approval_sent_at TIMESTAMP WITH TIME ZONE,
  approval_link TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_links table
CREATE TABLE public.project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  category project_link_category NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_credentials table
CREATE TABLE public.project_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  category project_credential_category NOT NULL,
  service_name TEXT NOT NULL,
  username TEXT,
  password_encrypted TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_whatsapp_templates table
CREATE TABLE public.project_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_types
CREATE POLICY "Admins can manage project types" ON public.project_types
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active project types" ON public.project_types
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- RLS Policies for project_stage_templates
CREATE POLICY "Admins can manage stage templates" ON public.project_stage_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active stage templates" ON public.project_stage_templates
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- RLS Policies for project_checklist_templates
CREATE POLICY "Admins can manage checklist templates" ON public.project_checklist_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active checklist templates" ON public.project_checklist_templates
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- RLS Policies for projects
CREATE POLICY "Admins can manage all projects" ON public.projects
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own projects" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
      AND (clients.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- RLS Policies for project_stages
CREATE POLICY "Admins can manage all project stages" ON public.project_stages
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their project stages" ON public.project_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = project_stages.project_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- RLS Policies for project_checklist_items
CREATE POLICY "Admins can manage all checklist items" ON public.project_checklist_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their checklist items" ON public.project_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      JOIN public.clients c ON c.id = p.client_id
      WHERE ps.id = project_checklist_items.project_stage_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- RLS Policies for project_links
CREATE POLICY "Admins can manage all project links" ON public.project_links
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their project links" ON public.project_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = project_links.project_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- RLS Policies for project_credentials (only admins)
CREATE POLICY "Admins can manage all project credentials" ON public.project_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for project_whatsapp_templates
CREATE POLICY "Admins can manage project whatsapp templates" ON public.project_whatsapp_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function to calculate project progress
CREATE OR REPLACE FUNCTION public.calculate_project_progress(project_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  SELECT 
    COUNT(*) INTO total_items
  FROM project_checklist_items pci
  JOIN project_stages ps ON ps.id = pci.project_stage_id
  WHERE ps.project_id = project_id_param;

  SELECT 
    COUNT(*) INTO completed_items
  FROM project_checklist_items pci
  JOIN project_stages ps ON ps.id = pci.project_stage_id
  WHERE ps.project_id = project_id_param
  AND pci.is_completed = true;

  IF total_items = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((completed_items::NUMERIC / total_items::NUMERIC) * 100, 2);
END;
$$;

-- Function to calculate stage progress
CREATE OR REPLACE FUNCTION public.calculate_stage_progress(stage_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items
  FROM project_checklist_items
  WHERE project_stage_id = stage_id_param;

  SELECT COUNT(*) INTO completed_items
  FROM project_checklist_items
  WHERE project_stage_id = stage_id_param
  AND is_completed = true;

  IF total_items = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((completed_items::NUMERIC / total_items::NUMERIC) * 100, 2);
END;
$$;

-- Function to create project stages from template
CREATE OR REPLACE FUNCTION public.create_project_stages_from_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create stages from template
  INSERT INTO project_stages (project_id, stage_template_id, name, description, "order")
  SELECT 
    NEW.id,
    pst.id,
    pst.name,
    pst.description,
    pst."order"
  FROM project_stage_templates pst
  WHERE pst.project_type_id = NEW.project_type_id
  AND pst.is_active = true
  ORDER BY pst."order";

  RETURN NEW;
END;
$$;

-- Function to create checklist items from template
CREATE OR REPLACE FUNCTION public.create_checklist_items_from_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create checklist items from template
  INSERT INTO project_checklist_items (
    project_stage_id, 
    checklist_template_id, 
    description, 
    "order",
    requires_approval,
    approval_type
  )
  SELECT 
    NEW.id,
    pct.id,
    pct.description,
    pct."order",
    pct.requires_approval,
    pct.approval_type
  FROM project_checklist_templates pct
  WHERE pct.stage_template_id = NEW.stage_template_id
  AND pct.is_active = true
  ORDER BY pct."order";

  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_project_types_updated_at
  BEFORE UPDATE ON public.project_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_stage_templates_updated_at
  BEFORE UPDATE ON public.project_stage_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_checklist_templates_updated_at
  BEFORE UPDATE ON public.project_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_stages_updated_at
  BEFORE UPDATE ON public.project_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_checklist_items_updated_at
  BEFORE UPDATE ON public.project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_links_updated_at
  BEFORE UPDATE ON public.project_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_credentials_updated_at
  BEFORE UPDATE ON public.project_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.project_whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create stages when project is created
CREATE TRIGGER create_stages_on_project_insert
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_project_stages_from_template();

-- Trigger to create checklist items when stage is created
CREATE TRIGGER create_checklist_on_stage_insert
  AFTER INSERT ON public.project_stages
  FOR EACH ROW EXECUTE FUNCTION public.create_checklist_items_from_template();

-- Insert default WhatsApp templates
INSERT INTO public.project_whatsapp_templates (template_key, name, description, template_text) VALUES
('project_layout_approval', 'Aprovação de Layout', 'Template para enviar link de aprovação do layout', 
'🎨 *Aprovação de Layout - {project_name}*

Olá, {client_name}!

O layout do seu projeto está pronto para revisão.

Por favor, acesse o link abaixo para visualizar:
🔗 {approval_link}

Aguardamos seu feedback para darmos continuidade ao desenvolvimento.

Qualquer dúvida, estamos à disposição! 😊

Atenciosamente,
Equipe May'),

('project_final_approval', 'Aprovação Final do Projeto', 'Template para enviar link de aprovação final/entrega', 
'🎉 *Projeto Concluído - {project_name}*

Olá, {client_name}!

Seu projeto foi finalizado e está pronto para aprovação final!

🔗 Acesse aqui: {approval_link}

Por favor, revise todos os detalhes e nos informe se está tudo conforme esperado.

Após sua aprovação, faremos o deploy para produção.

Obrigado pela confiança! 🚀

Atenciosamente,
Equipe May');