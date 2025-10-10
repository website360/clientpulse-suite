-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all contacts"
ON public.client_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view contacts of their clients"
ON public.client_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_contacts.client_id
    AND (clients.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);