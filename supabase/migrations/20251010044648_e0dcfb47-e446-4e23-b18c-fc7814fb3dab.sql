-- Remove a constraint antiga
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- Adiciona a nova constraint com os status atualizados
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('pending_signature', 'active', 'expired', 'completed'));