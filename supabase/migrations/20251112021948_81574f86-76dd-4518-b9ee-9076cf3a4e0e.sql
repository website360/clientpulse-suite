-- Atualizar função para copiar requires_client_approval dos templates
CREATE OR REPLACE FUNCTION public.create_project_stages_from_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insere somente templates que ainda não existem para o projeto
  INSERT INTO project_stages (project_id, stage_template_id, name, description, "order", requires_client_approval)
  SELECT 
    NEW.id,
    pst.id,
    pst.name,
    pst.description,
    pst."order",
    pst.requires_client_approval
  FROM project_stage_templates pst
  WHERE pst.project_type_id = NEW.project_type_id
    AND pst.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM project_stages ps
      WHERE ps.project_id = NEW.id
        AND ps.stage_template_id = pst.id
    )
  ORDER BY pst."order";

  RETURN NEW;
END;
$$;