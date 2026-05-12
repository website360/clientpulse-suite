-- Remove a feature "Mensagens" do sistema.
-- Ordem: tabelas dependentes primeiro; CASCADE para drop seguro de FKs/RLS.

DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.email_sync_status CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
