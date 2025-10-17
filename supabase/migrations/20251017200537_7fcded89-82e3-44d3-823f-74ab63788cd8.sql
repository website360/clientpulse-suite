-- Criar enum para tipo de documento
CREATE TYPE public.document_type AS ENUM ('contract', 'proposal');

-- Criar enum para status de assinatura Clicksign
CREATE TYPE public.clicksign_status AS ENUM ('draft', 'pending', 'signed', 'cancelled', 'expired');

-- Criar enum para categoria de credencial de projeto (se não existir)
DO $$ BEGIN
  CREATE TYPE public.project_credential_category AS ENUM ('hosting', 'domain', 'email', 'ftp', 'database', 'cms', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para categoria de link de projeto (se não existir)
DO $$ BEGIN
  CREATE TYPE public.project_link_category AS ENUM ('production', 'staging', 'development', 'design', 'documentation', 'repository');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de configurações Clicksign
CREATE TABLE public.clicksign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  api_token TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  webhook_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de templates de documentos
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type public.document_type NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  template_html TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  header_image_url TEXT,
  footer_image_url TEXT,
  watermark_url TEXT,
  page_backgrounds JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de documentos gerados
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  document_type public.document_type NOT NULL,
  document_name TEXT NOT NULL,
  generated_pdf_url TEXT,
  variables_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  clicksign_document_id TEXT,
  clicksign_status public.clicksign_status DEFAULT 'draft',
  clicksign_signed_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  asaas_payment_id TEXT,
  payment_status TEXT,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_message_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar buckets de storage para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('generated-documents', 'generated-documents', false, 52428800, ARRAY['application/pdf']::text[]),
  ('document-templates-assets', 'document-templates-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- RLS para clicksign_settings
ALTER TABLE public.clicksign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clicksign settings"
  ON public.clicksign_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all document templates"
  ON public.document_templates
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active templates"
  ON public.document_templates
  FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- RLS para generated_documents
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all generated documents"
  ON public.generated_documents
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own documents"
  ON public.generated_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = generated_documents.client_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- RLS para storage bucket generated-documents
CREATE POLICY "Admins can manage generated documents"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'generated-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own generated documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'generated-documents' AND
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      JOIN public.clients c ON c.id = gd.client_id
      WHERE gd.generated_pdf_url LIKE '%' || storage.objects.name || '%'
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- RLS para storage bucket document-templates-assets
CREATE POLICY "Admins can manage template assets"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'document-templates-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view template assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'document-templates-assets');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clicksign_settings_updated_at
  BEFORE UPDATE ON public.clicksign_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_document_templates_service ON public.document_templates(service_id);
CREATE INDEX idx_document_templates_type ON public.document_templates(document_type);
CREATE INDEX idx_generated_documents_client ON public.generated_documents(client_id);
CREATE INDEX idx_generated_documents_template ON public.generated_documents(template_id);
CREATE INDEX idx_generated_documents_contract ON public.generated_documents(contract_id);
CREATE INDEX idx_generated_documents_clicksign_status ON public.generated_documents(clicksign_status);