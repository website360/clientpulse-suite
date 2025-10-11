-- Adicionar colunas do Asaas à tabela accounts_receivable
ALTER TABLE accounts_receivable
ADD COLUMN IF NOT EXISTS asaas_payment_id text,
ADD COLUMN IF NOT EXISTS asaas_customer_id text,
ADD COLUMN IF NOT EXISTS asaas_invoice_url text,
ADD COLUMN IF NOT EXISTS asaas_status text,
ADD COLUMN IF NOT EXISTS asaas_billing_type text,
ADD COLUMN IF NOT EXISTS payment_confirmation_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS sync_with_asaas boolean DEFAULT false;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_asaas_payment_id 
ON accounts_receivable(asaas_payment_id) 
WHERE asaas_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_sync_with_asaas 
ON accounts_receivable(sync_with_asaas) 
WHERE sync_with_asaas = true;

-- Criar tabela asaas_customers
CREATE TABLE IF NOT EXISTS asaas_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  asaas_customer_id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Habilitar RLS
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asaas_customers
CREATE POLICY "Admins can manage asaas customers"
ON asaas_customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela asaas_webhooks
CREATE TABLE IF NOT EXISTS asaas_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payment_id text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Habilitar RLS
ALTER TABLE asaas_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asaas_webhooks
CREATE POLICY "Admins can view webhooks"
ON asaas_webhooks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela asaas_settings
CREATE TABLE IF NOT EXISTS asaas_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL DEFAULT 'sandbox',
  webhook_token text,
  auto_sync_payments boolean NOT NULL DEFAULT true,
  auto_create_on_receivable boolean NOT NULL DEFAULT false,
  default_billing_type text NOT NULL DEFAULT 'UNDEFINED',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE asaas_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asaas_settings
CREATE POLICY "Admins can manage asaas settings"
ON asaas_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_asaas_customers_updated_at
BEFORE UPDATE ON asaas_customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asaas_settings_updated_at
BEFORE UPDATE ON asaas_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão se não existir
INSERT INTO asaas_settings (environment, auto_sync_payments, auto_create_on_receivable, default_billing_type)
SELECT 'sandbox', true, false, 'UNDEFINED'
WHERE NOT EXISTS (SELECT 1 FROM asaas_settings LIMIT 1);