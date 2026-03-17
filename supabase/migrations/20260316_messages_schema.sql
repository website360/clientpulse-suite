-- Messages Schema for Email and WhatsApp Integration

-- Table for storing messages (emails and WhatsApp)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_phone TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  html_content TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'whatsapp')),
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  external_id TEXT, -- Email UID or WhatsApp message ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for email sync status
CREATE TABLE IF NOT EXISTS email_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_uid INTEGER,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_status_account_id ON email_sync_status(account_id);

-- RLS Policies (Row Level Security)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (account_id IN (
    SELECT id FROM message_accounts WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (account_id IN (
    SELECT id FROM message_accounts WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (account_id IN (
    SELECT id FROM message_accounts WHERE user_id = auth.uid()
  ));

-- Attachments policies
CREATE POLICY "Users can view their own attachments"
  ON message_attachments FOR SELECT
  USING (message_id IN (
    SELECT id FROM messages WHERE account_id IN (
      SELECT id FROM message_accounts WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert their own attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (message_id IN (
    SELECT id FROM messages WHERE account_id IN (
      SELECT id FROM message_accounts WHERE user_id = auth.uid()
    )
  ));

-- Sync status policies
CREATE POLICY "Users can view their own sync status"
  ON email_sync_status FOR SELECT
  USING (account_id IN (
    SELECT id FROM message_accounts WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own sync status"
  ON email_sync_status FOR UPDATE
  USING (account_id IN (
    SELECT id FROM message_accounts WHERE user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sync_status_updated_at
  BEFORE UPDATE ON email_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
