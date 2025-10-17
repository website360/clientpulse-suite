-- Criar função para atualizar status da etapa baseado nos checklists
CREATE OR REPLACE FUNCTION public.update_project_stage_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stage_id UUID;
  v_total_items INTEGER;
  v_completed_items INTEGER;
  v_new_status project_stage_status;
BEGIN
  -- Determinar o stage_id (funciona tanto para INSERT/UPDATE/DELETE)
  v_stage_id := COALESCE(NEW.project_stage_id, OLD.project_stage_id);
  
  -- Contar total de itens e itens concluídos
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = true)
  INTO v_total_items, v_completed_items
  FROM project_checklist_items
  WHERE project_stage_id = v_stage_id;
  
  -- Determinar novo status
  IF v_total_items = 0 THEN
    v_new_status := 'pendente';
  ELSIF v_completed_items = 0 THEN
    v_new_status := 'pendente';
  ELSIF v_completed_items = v_total_items THEN
    v_new_status := 'concluido';
    
    -- Atualizar completed_at se estiver sendo marcado como concluído
    UPDATE project_stages
    SET 
      status = v_new_status,
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_stage_id AND status != 'concluido';
    
    RETURN COALESCE(NEW, OLD);
  ELSE
    v_new_status := 'em_andamento';
    
    -- Atualizar started_at se estiver sendo marcado como em andamento pela primeira vez
    UPDATE project_stages
    SET 
      status = v_new_status,
      started_at = COALESCE(started_at, NOW()),
      updated_at = NOW()
    WHERE id = v_stage_id AND status = 'pendente';
    
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Atualizar status da etapa
  UPDATE project_stages
  SET 
    status = v_new_status,
    updated_at = NOW()
  WHERE id = v_stage_id AND status != v_new_status;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Criar trigger para atualizar status ao modificar checklists
DROP TRIGGER IF EXISTS on_checklist_item_changed ON project_checklist_items;
CREATE TRIGGER on_checklist_item_changed
  AFTER INSERT OR UPDATE OR DELETE ON project_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stage_status();