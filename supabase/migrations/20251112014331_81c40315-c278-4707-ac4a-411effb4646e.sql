-- Adicionar evento de ticket respondido por contato
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'ticket_response_contact';