-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Admins can manage all suppliers"
ON public.suppliers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all suppliers"
ON public.suppliers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify accounts_payable to use supplier_id instead of client_id
ALTER TABLE public.accounts_payable
DROP COLUMN IF EXISTS client_id;

ALTER TABLE public.accounts_payable
ADD COLUMN supplier_id UUID NOT NULL REFERENCES public.suppliers(id);

-- Add occurrence fields to accounts_payable (same as accounts_receivable)
ALTER TABLE public.accounts_payable
ADD COLUMN occurrence_type text CHECK (occurrence_type IN ('unica', 'mensal', 'trimestral', 'semestral', 'anual', 'parcelada')) DEFAULT 'unica',
ADD COLUMN due_day integer,
ADD COLUMN installments integer,
ADD COLUMN installment_number integer,
ADD COLUMN total_installments integer,
ADD COLUMN parent_payable_id uuid REFERENCES accounts_payable(id) ON DELETE CASCADE,
ADD COLUMN issue_date date;

-- Add comments for clarity
COMMENT ON TABLE public.suppliers IS 'Suppliers/vendors for accounts payable';
COMMENT ON COLUMN public.accounts_payable.occurrence_type IS 'Type of occurrence: unica, mensal, trimestral, semestral, anual, parcelada';
COMMENT ON COLUMN public.accounts_payable.due_day IS 'Day of month for recurring charges (1-31)';
COMMENT ON COLUMN public.accounts_payable.installments IS 'Number of installments for parcelada';
COMMENT ON COLUMN public.accounts_payable.installment_number IS 'Current installment number';
COMMENT ON COLUMN public.accounts_payable.total_installments IS 'Total number of installments';
COMMENT ON COLUMN public.accounts_payable.parent_payable_id IS 'Reference to parent payable if this is a generated charge';
COMMENT ON COLUMN public.accounts_payable.issue_date IS 'Issue date of the payable';