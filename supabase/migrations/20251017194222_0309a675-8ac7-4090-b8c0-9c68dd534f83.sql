-- 1) Remover checklists de stages duplicados (mantendo o primeiro stage de cada template)
WITH stage_dups AS (
  SELECT id,
         project_id,
         stage_template_id,
         name,
         "order",
         ROW_NUMBER() OVER (
           PARTITION BY project_id, COALESCE(stage_template_id::text, name || ':' || "order"::text)
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM project_stages
)
DELETE FROM project_checklist_items pci
USING stage_dups sd
WHERE pci.project_stage_id = sd.id
  AND sd.rn > 1;

-- 2) Remover os stages duplicados, mantendo apenas o primeiro
WITH stage_dups AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY project_id, COALESCE(stage_template_id::text, name || ':' || "order"::text)
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM project_stages
)
DELETE FROM project_stages ps
USING stage_dups sd
WHERE ps.id = sd.id
  AND sd.rn > 1;

-- 3) Criar índices únicos para evitar novas duplicações
CREATE UNIQUE INDEX IF NOT EXISTS ux_project_stages_project_template
  ON project_stages(project_id, stage_template_id)
  WHERE stage_template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_checklist_items_stage_template
  ON project_checklist_items(project_stage_id, checklist_template_id)
  WHERE checklist_template_id IS NOT NULL;

-- 4) Atualizar função para não inserir stages duplicados
CREATE OR REPLACE FUNCTION public.create_project_stages_from_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insere somente templates que ainda não existem para o projeto
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
    AND NOT EXISTS (
      SELECT 1 FROM project_stages ps
      WHERE ps.project_id = NEW.id
        AND ps.stage_template_id = pst.id
    )
  ORDER BY pst."order";

  RETURN NEW;
END;
$function$;

-- 5) Garantir checklist sem duplicação já foi tratado na função; manter por segurança
CREATE OR REPLACE FUNCTION public.create_checklist_items_from_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas cria itens se ainda não existir nenhum para o stage
  IF NOT EXISTS (
    SELECT 1 FROM project_checklist_items WHERE project_stage_id = NEW.id
  ) THEN
    INSERT INTO project_checklist_items (
      project_stage_id, checklist_template_id, description, "order", requires_approval, approval_type
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
      AND NOT EXISTS (
        SELECT 1 FROM project_checklist_items pci
        WHERE pci.project_stage_id = NEW.id
          AND pci.checklist_template_id = pct.id
      )
    ORDER BY pct."order";
  END IF;

  RETURN NEW;
END;
$function$;