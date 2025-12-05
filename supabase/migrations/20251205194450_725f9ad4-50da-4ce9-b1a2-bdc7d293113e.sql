-- Tornar client_id opcional na tabela tickets
ALTER TABLE tickets ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar campos para solicitante anônimo (quando não há cliente vinculado)
ALTER TABLE tickets ADD COLUMN requester_name TEXT;
ALTER TABLE tickets ADD COLUMN requester_email TEXT;
ALTER TABLE tickets ADD COLUMN requester_phone TEXT;

-- Índice para busca por email do solicitante
CREATE INDEX idx_tickets_requester_email ON tickets(requester_email) WHERE requester_email IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN tickets.requester_name IS 'Nome do solicitante quando ticket é criado sem cliente vinculado';
COMMENT ON COLUMN tickets.requester_email IS 'Email do solicitante quando ticket é criado sem cliente vinculado';
COMMENT ON COLUMN tickets.requester_phone IS 'Telefone do solicitante quando ticket é criado sem cliente vinculado';