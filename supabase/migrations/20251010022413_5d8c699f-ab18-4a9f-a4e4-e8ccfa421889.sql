-- Create payment_status enum
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'received', 'overdue', 'canceled');

-- Create accounts_payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  attachment_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts_receivable table
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  invoice_number TEXT,
  attachment_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts_payable
CREATE POLICY "Admins can manage all payable accounts"
  ON public.accounts_payable
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all payable accounts"
  ON public.accounts_payable
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for accounts_receivable
CREATE POLICY "Admins can manage all receivable accounts"
  ON public.accounts_receivable
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all receivable accounts"
  ON public.accounts_receivable
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for financial attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-attachments', 'financial-attachments', false);

-- Storage policies for financial attachments
CREATE POLICY "Admins can upload financial attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'financial-attachments' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can view financial attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'financial-attachments' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete financial attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'financial-attachments' AND
    has_role(auth.uid(), 'admin'::app_role)
  );