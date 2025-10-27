-- Criar bucket público para assets de branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Leitura pública
CREATE POLICY "Public read branding"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

-- Política: Apenas admins podem fazer upload
CREATE POLICY "Admin write branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Política: Apenas admins podem atualizar
CREATE POLICY "Admin update branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'branding' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Política: Apenas admins podem deletar
CREATE POLICY "Admin delete branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding' 
  AND public.has_role(auth.uid(), 'admin')
);