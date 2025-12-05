-- Create storage bucket for ticket attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to upload to ticket-attachments bucket (for public ticket form)
CREATE POLICY "Public can upload ticket attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow public to view ticket attachments
CREATE POLICY "Public can view ticket attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticket-attachments');