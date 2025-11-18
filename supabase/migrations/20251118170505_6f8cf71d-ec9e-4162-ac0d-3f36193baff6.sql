-- Adicionar campo para indicar se o domínio está na Cloudflare
ALTER TABLE domains ADD COLUMN is_cloudflare BOOLEAN DEFAULT FALSE NOT NULL;