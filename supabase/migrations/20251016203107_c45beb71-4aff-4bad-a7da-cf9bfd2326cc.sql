-- Adicionar campo de telefone na tabela client_contacts
ALTER TABLE client_contacts
ADD COLUMN IF NOT EXISTS phone TEXT;