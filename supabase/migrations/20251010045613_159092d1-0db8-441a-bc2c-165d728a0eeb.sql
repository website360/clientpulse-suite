-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  reference_type TEXT CHECK (reference_type IN ('ticket', 'contract', 'domain', 'payment')),
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to check expiring contracts and create notifications
CREATE OR REPLACE FUNCTION public.check_expiring_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  -- Check for contracts expiring in 30, 15, 7, 3, and 1 day(s)
  FOR contract_record IN
    SELECT 
      c.id,
      c.end_date,
      c.client_id,
      cl.full_name as client_name,
      cl.company_name,
      s.name as service_name,
      p.id as user_id
    FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    JOIN services s ON c.service_id = s.id
    LEFT JOIN profiles p ON cl.user_id = p.id
    WHERE c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date > CURRENT_DATE
      AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    days_until_expiry := c.end_date - CURRENT_DATE;
    
    -- Check if notification should be sent (30, 15, 7, 3, 1 days)
    IF days_until_expiry IN (30, 15, 7, 3, 1) THEN
      -- Check if notification already exists for this contract and timeframe
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE reference_type = 'contract'
          AND reference_id = contract_record.id
          AND created_at::date = CURRENT_DATE
          AND description LIKE '%' || days_until_expiry || ' dia%'
      ) THEN
        -- Create notification for admin users
        INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
        SELECT 
          ur.user_id,
          'Contrato próximo do vencimento',
          'O contrato de ' || COALESCE(contract_record.company_name, contract_record.client_name) || 
          ' (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
          CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
          CASE 
            WHEN days_until_expiry <= 3 THEN 'error'
            WHEN days_until_expiry <= 7 THEN 'warning'
            ELSE 'info'
          END,
          'contract',
          contract_record.id
        FROM user_roles ur
        WHERE ur.role = 'admin'
        ON CONFLICT DO NOTHING;
        
        -- Also notify the client's user if exists
        IF contract_record.user_id IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
          VALUES (
            contract_record.user_id,
            'Contrato próximo do vencimento',
            'Seu contrato (' || contract_record.service_name || ') vence em ' || days_until_expiry || 
            CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
            CASE 
              WHEN days_until_expiry <= 3 THEN 'error'
              WHEN days_until_expiry <= 7 THEN 'warning'
              ELSE 'info'
            END,
            'contract',
            contract_record.id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Similar function for expiring domains
CREATE OR REPLACE FUNCTION public.check_expiring_domains()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  FOR domain_record IN
    SELECT 
      d.id,
      d.domain,
      d.expires_at,
      d.client_id,
      cl.full_name as client_name,
      cl.company_name,
      p.id as user_id
    FROM domains d
    JOIN clients cl ON d.client_id = cl.id
    LEFT JOIN profiles p ON cl.user_id = p.id
    WHERE d.expires_at > CURRENT_DATE
      AND d.expires_at <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    days_until_expiry := domain_record.expires_at - CURRENT_DATE;
    
    IF days_until_expiry IN (30, 15, 7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE reference_type = 'domain'
          AND reference_id = domain_record.id
          AND created_at::date = CURRENT_DATE
          AND description LIKE '%' || days_until_expiry || ' dia%'
      ) THEN
        INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
        SELECT 
          ur.user_id,
          'Domínio próximo do vencimento',
          'O domínio ' || domain_record.domain || ' de ' || 
          COALESCE(domain_record.company_name, domain_record.client_name) || 
          ' vence em ' || days_until_expiry || 
          CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
          CASE 
            WHEN days_until_expiry <= 3 THEN 'error'
            WHEN days_until_expiry <= 7 THEN 'warning'
            ELSE 'info'
          END,
          'domain',
          domain_record.id
        FROM user_roles ur
        WHERE ur.role = 'admin'
        ON CONFLICT DO NOTHING;
        
        IF domain_record.user_id IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, description, type, reference_type, reference_id)
          VALUES (
            domain_record.user_id,
            'Domínio próximo do vencimento',
            'Seu domínio ' || domain_record.domain || ' vence em ' || days_until_expiry || 
            CASE WHEN days_until_expiry = 1 THEN ' dia' ELSE ' dias' END,
            CASE 
              WHEN days_until_expiry <= 3 THEN 'error'
              WHEN days_until_expiry <= 7 THEN 'warning'
              ELSE 'info'
            END,
            'domain',
            domain_record.id
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;