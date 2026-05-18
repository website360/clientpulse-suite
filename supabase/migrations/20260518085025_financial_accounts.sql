-- Suporte a múltiplas contas financeiras (Pessoal/Empresa/Escritório/...)
-- + transferências entre contas.

-- 1) Tabela de contas financeiras
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  color text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial accounts"
  ON public.financial_accounts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Garante apenas uma conta default por vez
CREATE UNIQUE INDEX IF NOT EXISTS uniq_financial_accounts_default
  ON public.financial_accounts (is_default) WHERE is_default = true;

-- 2) Seed da conta padrão "Empresa"
INSERT INTO public.financial_accounts (name, type, is_default, display_order)
VALUES ('Empresa', 'empresa', true, 0)
ON CONFLICT DO NOTHING;

-- 3) Acrescenta financial_account_id em accounts_receivable e accounts_payable
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS financial_account_id uuid REFERENCES public.financial_accounts(id);

ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS financial_account_id uuid REFERENCES public.financial_accounts(id);

-- 4) Backfill: tudo que estava sem conta vai para "Empresa"
UPDATE public.accounts_receivable
SET financial_account_id = (SELECT id FROM public.financial_accounts WHERE is_default = true LIMIT 1)
WHERE financial_account_id IS NULL;

UPDATE public.accounts_payable
SET financial_account_id = (SELECT id FROM public.financial_accounts WHERE is_default = true LIMIT 1)
WHERE financial_account_id IS NULL;

-- 5) Torna NOT NULL após o backfill
ALTER TABLE public.accounts_receivable
  ALTER COLUMN financial_account_id SET NOT NULL;
ALTER TABLE public.accounts_payable
  ALTER COLUMN financial_account_id SET NOT NULL;

-- 6) Índices para filtro por conta
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_financial_account
  ON public.accounts_receivable(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_financial_account
  ON public.accounts_payable(financial_account_id);

-- 7) Tabela de transferências entre contas
CREATE TABLE IF NOT EXISTS public.financial_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_account_id uuid NOT NULL REFERENCES public.financial_accounts(id),
  target_account_id uuid NOT NULL REFERENCES public.financial_accounts(id),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  payable_id uuid REFERENCES public.accounts_payable(id) ON DELETE SET NULL,
  receivable_id uuid REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_account_id <> target_account_id)
);

ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial transfers"
  ON public.financial_transfers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_financial_transfers_source
  ON public.financial_transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transfers_target
  ON public.financial_transfers(target_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transfers_date
  ON public.financial_transfers(transfer_date);

-- 8) Cliente e fornecedor "Sistema" para suportar transferências entre contas
--    (accounts_receivable exige client_id NOT NULL; accounts_payable exige supplier_id NOT NULL)
INSERT INTO public.clients (full_name, email, phone, client_type, is_active)
SELECT 'Sistema – Transferência Interna', 'sistema@interno.local', '0000000000', 'person'::public.client_type, true
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'sistema@interno.local');

-- suppliers.created_by é NOT NULL — usa o primeiro admin disponível como dono
INSERT INTO public.suppliers (name, is_active, created_by)
SELECT
  'Sistema – Transferência Interna',
  true,
  (SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Sistema – Transferência Interna');
