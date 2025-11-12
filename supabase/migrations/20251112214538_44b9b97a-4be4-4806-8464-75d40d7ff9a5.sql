-- Remove duplicate notification templates, keeping only the oldest one for each event_type
WITH ranked_templates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY event_type ORDER BY created_at ASC) as rn
  FROM notification_templates
)
DELETE FROM notification_templates
WHERE id IN (
  SELECT id FROM ranked_templates WHERE rn > 1
);

-- Add RLS policy to allow admins to delete notification logs
CREATE POLICY "Admins can delete notification logs"
ON notification_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));