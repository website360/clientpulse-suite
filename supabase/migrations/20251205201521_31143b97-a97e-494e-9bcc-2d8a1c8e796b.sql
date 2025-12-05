-- Make uploaded_by column nullable to allow anonymous attachments from public ticket form
ALTER TABLE ticket_attachments ALTER COLUMN uploaded_by DROP NOT NULL;