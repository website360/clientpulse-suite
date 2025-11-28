-- Criar tabela de propostas
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  company_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  validity_days INTEGER DEFAULT 30,
  notes TEXT,
  generated_pdf_url TEXT,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de páginas de propostas
CREATE TABLE IF NOT EXISTS public.proposal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  page_order INTEGER NOT NULL,
  background_type TEXT NOT NULL DEFAULT 'color' CHECK (background_type IN ('color', 'gradient', 'image')),
  background_value TEXT NOT NULL DEFAULT '#ffffff',
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposal_id, page_order)
);

-- Criar tabela de serviços de propostas
CREATE TABLE IF NOT EXISTS public.proposal_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  custom_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  service_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_pages_proposal_id ON public.proposal_pages(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_services_proposal_id ON public.proposal_services(proposal_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposals_updated_at();

CREATE TRIGGER trigger_update_proposal_pages_updated_at
  BEFORE UPDATE ON public.proposal_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposals_updated_at();

CREATE TRIGGER trigger_update_proposal_services_updated_at
  BEFORE UPDATE ON public.proposal_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposals_updated_at();

-- RLS Policies
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_services ENABLE ROW LEVEL SECURITY;

-- Policies para proposals
CREATE POLICY "Admins can manage all proposals"
  ON public.proposals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their own proposals"
  ON public.proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = proposals.client_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Policies para proposal_pages
CREATE POLICY "Admins can manage all proposal pages"
  ON public.proposal_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view pages of their proposals"
  ON public.proposal_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = proposal_pages.proposal_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Policies para proposal_services
CREATE POLICY "Admins can manage all proposal services"
  ON public.proposal_services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view services of their proposals"
  ON public.proposal_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = proposal_services.proposal_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );