-- Payables: torna supplier_id opcional e adiciona payee_name (nome livre).
-- Caso de uso: contas tipo escritório onde não há fornecedor cadastrado,
-- só o nome livre do beneficiário/responsável.

ALTER TABLE public.accounts_payable
  ALTER COLUMN supplier_id DROP NOT NULL;

ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS payee_name text;

-- Pelo menos um dos dois precisa estar preenchido
ALTER TABLE public.accounts_payable
  ADD CONSTRAINT accounts_payable_payee_required
  CHECK (supplier_id IS NOT NULL OR payee_name IS NOT NULL);
