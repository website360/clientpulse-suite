-- =======================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- Corrige TODAS as tabelas e policies do sistema de mensagens
-- =======================================================

-- 1. Alterar account_id para TEXT (se for UUID)
ALTER TABLE messages ALTER COLUMN account_id TYPE TEXT;
ALTER TABLE email_sync_status ALTER COLUMN account_id TYPE TEXT;

-- 2. Adicionar coluna html_content se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'html_content'
  ) THEN
    ALTER TABLE messages ADD COLUMN html_content TEXT;
  END IF;
END $$;

-- 3. Adicionar UNIQUE em external_id (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'messages_external_id_key'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_external_id_key UNIQUE (external_id);
  END IF;
END $$;

-- 4. REMOVER todas as policies restritivas que bloqueiam acesso
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own attachments" ON message_attachments;
DROP POLICY IF EXISTS "Users can insert their own attachments" ON message_attachments;
DROP POLICY IF EXISTS "Users can view their own sync status" ON email_sync_status;
DROP POLICY IF EXISTS "Users can update their own sync status" ON email_sync_status;
DROP POLICY IF EXISTS "Users can insert their own sync status" ON email_sync_status;
DROP POLICY IF EXISTS "Allow service role full access messages" ON messages;
DROP POLICY IF EXISTS "Allow service role full access sync status" ON email_sync_status;

-- 5. Criar policies PERMISSIVAS (acesso total)
CREATE POLICY "Allow full access messages"
  ON messages FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access sync status"
  ON email_sync_status FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access attachments"
  ON message_attachments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Pronto! Agora as mensagens serão visíveis no sistema.
