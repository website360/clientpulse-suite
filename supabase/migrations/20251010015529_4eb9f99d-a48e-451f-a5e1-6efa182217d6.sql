-- Create enum for domain owner
CREATE TYPE domain_owner AS ENUM ('agency', 'client');

-- Create domains table
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  expires_at DATE NOT NULL,
  owner domain_owner NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all domains"
ON public.domains
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view domains of their clients"
ON public.domains
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients
    WHERE clients.id = domains.client_id
    AND (clients.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_domains_updated_at
BEFORE UPDATE ON public.domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_domains_client_id ON public.domains(client_id);
CREATE INDEX idx_domains_expires_at ON public.domains(expires_at);