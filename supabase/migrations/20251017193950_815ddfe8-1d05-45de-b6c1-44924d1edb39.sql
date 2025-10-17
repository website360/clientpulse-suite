-- Remover itens duplicados usando uma CTE e mantendo apenas o primeiro registro de cada grupo
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY project_stage_id, checklist_template_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM project_checklist_items
  WHERE checklist_template_id IS NOT NULL
)
DELETE FROM project_checklist_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Modificar a função para verificar se já existem itens antes de criar
CREATE OR REPLACE FUNCTION public.create_checklist_items_from_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se já existem itens para este stage
  IF NOT EXISTS (
    SELECT 1 
    FROM project_checklist_items 
    WHERE project_stage_id = NEW.id
  ) THEN
    -- Create checklist items from template apenas se não existirem
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
  END IF;

  RETURN NEW;
END;
$function$;