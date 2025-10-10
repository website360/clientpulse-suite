-- Create payment categories table
CREATE TABLE public.payment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('payable', 'receivable')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create payment methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_categories
CREATE POLICY "Everyone can view active categories"
  ON public.payment_categories
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage categories"
  ON public.payment_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for payment_methods
CREATE POLICY "Everyone can view active payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_payment_categories_updated_at
  BEFORE UPDATE ON public.payment_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for payable
INSERT INTO public.payment_categories (name, type) VALUES
  ('Fornecedores', 'payable'),
  ('Impostos', 'payable'),
  ('Salários', 'payable'),
  ('Aluguel', 'payable'),
  ('Serviços', 'payable');

-- Insert default categories for receivable
INSERT INTO public.payment_categories (name, type) VALUES
  ('Serviços', 'receivable'),
  ('Produtos', 'receivable'),
  ('Mensalidades', 'receivable'),
  ('Consultoria', 'receivable');

-- Insert default payment methods
INSERT INTO public.payment_methods (name) VALUES
  ('Dinheiro'),
  ('PIX'),
  ('Transferência Bancária'),
  ('Cartão de Crédito'),
  ('Cartão de Débito'),
  ('Boleto'),
  ('Cheque');