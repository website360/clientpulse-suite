-- Create table to log WhatsApp notifications and prevent duplicates
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_log_ticket_event ON public.whatsapp_notification_log(ticket_id, event_type, sent_at);

-- Enable RLS
ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view notification logs"
  ON public.whatsapp_notification_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));