-- Adicionar novos tipos de eventos de tickets ao enum
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_closed';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_resolved';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_reopened';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_response_admin';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_response_client';