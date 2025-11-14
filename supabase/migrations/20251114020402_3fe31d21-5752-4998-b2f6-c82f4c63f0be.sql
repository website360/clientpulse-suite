-- Adicionar novos valores ao enum notification_event_type
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'project_approval_requested';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'project_approval_confirmed';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'project_mention';