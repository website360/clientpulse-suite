-- Fix RLS policies for project_stage_approvals (corrigir erro de sintaxe)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create stage approvals" ON project_stage_approvals;

-- Recriar política de INSERT corretamente
CREATE POLICY "Users can create stage approvals"
ON project_stage_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM project_stages ps
    JOIN projects proj ON ps.project_id = proj.id
    WHERE ps.id = project_stage_approvals.project_stage_id
    AND proj.created_by = auth.uid()
  )
);