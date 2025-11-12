-- Desabilitar horário de silêncio para permitir notificações a qualquer hora
UPDATE notification_settings 
SET quiet_hours_enabled = false 
WHERE quiet_hours_enabled = true;