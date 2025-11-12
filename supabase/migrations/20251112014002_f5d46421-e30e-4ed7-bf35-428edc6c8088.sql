-- Adicionar novos tipos de eventos de tickets ao enum
-- Esta migração apenas adiciona os valores, a próxima migração irá inserir os templates

ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_closed';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_resolved';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_reopened';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_response_admin';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_response_client';