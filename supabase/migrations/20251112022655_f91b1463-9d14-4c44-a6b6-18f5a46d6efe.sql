-- Adicionar novos tipos de eventos para aprovações com níveis de urgência
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'approval_reminder_normal';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'approval_reminder_medium';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'approval_reminder_high';