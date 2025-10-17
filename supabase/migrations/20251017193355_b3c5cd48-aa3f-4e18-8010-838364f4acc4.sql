-- Create trigger to automatically create project stages from templates when a project is created
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_stages_from_template();

-- Create trigger to automatically create checklist items from templates when a stage is created
CREATE TRIGGER on_project_stage_created
  AFTER INSERT ON project_stages
  FOR EACH ROW
  EXECUTE FUNCTION create_checklist_items_from_template();