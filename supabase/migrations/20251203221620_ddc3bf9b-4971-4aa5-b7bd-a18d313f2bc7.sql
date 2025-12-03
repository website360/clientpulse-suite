-- Criar o trigger que estava faltando na tabela notification_logs
-- Este trigger atualiza whatsapp_sent quando um log de notificação é salvo com sucesso

DO $$
BEGIN
  -- Verificar se o trigger já existe antes de criar
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_exec_whatsapp_status'
  ) THEN
    CREATE TRIGGER trg_update_exec_whatsapp_status
      AFTER INSERT ON notification_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_maintenance_execution_whatsapp_status();
    
    RAISE NOTICE 'Trigger trg_update_exec_whatsapp_status criado com sucesso';
  ELSE
    RAISE NOTICE 'Trigger trg_update_exec_whatsapp_status já existe';
  END IF;
END $$;