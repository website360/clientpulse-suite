-- Receivables: torna client_id opcional e adiciona payer_name (nome livre)
-- Caso de uso: contas pessoais/escritório/etc. recebem valores sem cliente cadastrado.

ALTER TABLE public.accounts_receivable
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS payer_name text;

-- Pelo menos um dos dois precisa estar preenchido
ALTER TABLE public.accounts_receivable
  ADD CONSTRAINT accounts_receivable_payer_required
  CHECK (client_id IS NOT NULL OR payer_name IS NOT NULL);
