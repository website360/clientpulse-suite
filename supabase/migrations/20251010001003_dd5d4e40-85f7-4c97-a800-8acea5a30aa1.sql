-- Create ticket_attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- RLS Policies for ticket_attachments bucket
CREATE POLICY "Users can upload attachments to their tickets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tickets 
    WHERE created_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tickets.client_id 
      AND clients.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view attachments of their tickets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tickets 
    WHERE created_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = tickets.client_id 
      AND clients.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all ticket attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);