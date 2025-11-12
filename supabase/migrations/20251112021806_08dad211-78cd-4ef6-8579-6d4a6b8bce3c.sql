-- Adicionar campo para controlar se a etapa requer aprovação do cliente
ALTER TABLE public.project_stages
ADD COLUMN IF NOT EXISTS requires_client_approval boolean NOT NULL DEFAULT false;

-- Adicionar campo nos templates também
ALTER TABLE public.project_stage_templates
ADD COLUMN IF NOT EXISTS requires_client_approval boolean NOT NULL DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN public.project_stages.requires_client_approval IS 'Indica se esta etapa requer aprovação formal do cliente antes de ser considerada concluída';
COMMENT ON COLUMN public.project_stage_templates.requires_client_approval IS 'Define se etapas criadas a partir deste template vão requerer aprovação do cliente por padrão';