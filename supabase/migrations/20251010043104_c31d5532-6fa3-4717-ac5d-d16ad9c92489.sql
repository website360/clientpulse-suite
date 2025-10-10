-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS policies for services
CREATE POLICY "Admins can manage all services"
  ON public.services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active services"
  ON public.services
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  amount NUMERIC NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  payment_terms TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Admins can manage all contracts"
  ON public.contracts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view contracts of their clients"
  ON public.contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contracts.client_id
      AND (clients.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Create storage bucket for contract attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-attachments', 'contract-attachments', false);

-- Storage policies for contract attachments
CREATE POLICY "Users can view contract attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contract-attachments' AND
    (has_role(auth.uid(), 'admin') OR 
     EXISTS (
       SELECT 1 FROM contracts
       WHERE contracts.attachment_url = storage.objects.name
       AND (contracts.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM clients WHERE clients.id = contracts.client_id AND clients.user_id = auth.uid()))
     ))
  );

CREATE POLICY "Admins can upload contract attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contract-attachments' AND
    has_role(auth.uid(), 'admin')
  );

-- Add trigger for updated_at on services
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on contracts
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();