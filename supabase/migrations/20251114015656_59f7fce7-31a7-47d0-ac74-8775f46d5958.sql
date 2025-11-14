-- Fix RLS policies for project_stage_approvals table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view stage approvals for their projects" ON project_stage_approvals;
DROP POLICY IF EXISTS "Users can create stage approvals for their projects" ON project_stage_approvals;
DROP POLICY IF EXISTS "Users can update stage approvals for their projects" ON project_stage_approvals;
DROP POLICY IF EXISTS "Public can view approvals by token" ON project_stage_approvals;
DROP POLICY IF EXISTS "Public can update approvals by token" ON project_stage_approvals;

-- Enable RLS
ALTER TABLE project_stage_approvals ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view approvals for their projects
CREATE POLICY "Users can view stage approvals for their projects"
ON project_stage_approvals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_stages ps
    JOIN projects p ON ps.project_id = p.id
    WHERE ps.id = project_stage_approvals.project_stage_id
    AND p.created_by = auth.uid()
  )
);

-- Policy for authenticated users to create approvals
CREATE POLICY "Users can create stage approvals"
ON project_stage_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_stages ps
    JOIN projects p ON ps.project_id = p.id
    WHERE ps.id = project_stage_approvals.project_stage_id
    AND p.created_by = auth.uid()
  )
);

-- Policy for authenticated users to update their own approval requests
CREATE POLICY "Users can update their own approval requests"
ON project_stage_approvals
FOR UPDATE
TO authenticated
USING (requested_by = auth.uid());

-- Policy for public access via token (for approval page)
CREATE POLICY "Public can view approvals by token"
ON project_stage_approvals
FOR SELECT
TO anon, authenticated
USING (approval_token IS NOT NULL);

-- Policy for public to update via token (approve/reject)
CREATE POLICY "Public can update approvals by token"
ON project_stage_approvals
FOR UPDATE
TO anon, authenticated
USING (approval_token IS NOT NULL);