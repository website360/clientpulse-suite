-- Garantir que o bucket ticket-attachments existe e está público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ticket-attachments', 'ticket-attachments', true, 10485760, NULL)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Garantir que as políticas de RLS permitam acesso público para leitura
DROP POLICY IF EXISTS "Allow public read access to ticket attachments" ON storage.objects;

CREATE POLICY "Allow public read access to ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Política para usuários autenticados enviarem arquivos
DROP POLICY IF EXISTS "Allow authenticated users to upload ticket attachments" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Política para usuários autenticados atualizarem seus próprios arquivos
DROP POLICY IF EXISTS "Allow authenticated users to update ticket attachments" ON storage.objects;

CREATE POLICY "Allow authenticated users to update ticket attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Política para usuários autenticados deletarem arquivos
DROP POLICY IF EXISTS "Allow authenticated users to delete ticket attachments" ON storage.objects;

CREATE POLICY "Allow authenticated users to delete ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments');