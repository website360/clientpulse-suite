-- Criar índice para melhorar performance de queries por parent_receivable_id
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_parent_id 
ON accounts_receivable(parent_receivable_id) 
WHERE parent_receivable_id IS NOT NULL;

-- Adicionar constraint para garantir integridade referencial
-- (parent_receivable_id deve apontar para um registro existente)
ALTER TABLE accounts_receivable
ADD CONSTRAINT fk_parent_receivable 
FOREIGN KEY (parent_receivable_id) 
REFERENCES accounts_receivable(id) 
ON DELETE CASCADE;

-- Criar função para identificar parent correto (útil para queries futuras)
CREATE OR REPLACE FUNCTION get_receivable_parent_id(receivable_id UUID)
RETURNS UUID AS $$
DECLARE
  parent_id UUID;
  occ_type TEXT;
BEGIN
  SELECT parent_receivable_id, occurrence_type 
  INTO parent_id, occ_type
  FROM accounts_receivable 
  WHERE id = receivable_id;
  
  -- Se tem parent, retorna ele
  IF parent_id IS NOT NULL THEN
    RETURN parent_id;
  END IF;
  
  -- Se é única, não tem parent
  IF occ_type = 'unica' THEN
    RETURN NULL;
  END IF;
  
  -- Se é recorrente/parcelada sem parent, ela É o parent
  RETURN receivable_id;
END;
$$ LANGUAGE plpgsql STABLE;