-- Create client_accesses table
CREATE TABLE IF NOT EXISTS client_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  url TEXT,
  username VARCHAR(255),
  password TEXT,
  favicon_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_client_accesses_client_id ON client_accesses(client_id);
CREATE INDEX idx_client_accesses_is_active ON client_accesses(is_active);

-- Enable RLS
ALTER TABLE client_accesses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view client accesses"
  ON client_accesses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert client accesses"
  ON client_accesses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update client accesses"
  ON client_accesses FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete client accesses"
  ON client_accesses FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_client_accesses_updated_at
  BEFORE UPDATE ON client_accesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
