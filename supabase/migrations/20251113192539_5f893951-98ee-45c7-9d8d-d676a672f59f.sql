-- Add INSERT policies for maintenance_executions
CREATE POLICY "Admins can insert maintenance executions"
ON maintenance_executions
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add INSERT policies for maintenance_execution_items
CREATE POLICY "Admins can insert maintenance execution items"
ON maintenance_execution_items
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 
    FROM maintenance_executions me
    WHERE me.id = maintenance_execution_items.maintenance_execution_id
  )
);