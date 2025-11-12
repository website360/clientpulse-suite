-- Create approval settings table
CREATE TABLE IF NOT EXISTS public.approval_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_before_notification integer NOT NULL DEFAULT 3,
  notification_frequency_days integer NOT NULL DEFAULT 2,
  email_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

-- Policy for admins
CREATE POLICY "Admins can manage approval settings"
ON public.approval_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add notification tracking to project_stage_approvals
ALTER TABLE public.project_stage_approvals
ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS notification_count integer DEFAULT 0;

-- Insert default settings
INSERT INTO public.approval_settings (days_before_notification, notification_frequency_days, email_enabled, whatsapp_enabled)
VALUES (3, 2, true, true)
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_approval_settings_updated_at
BEFORE UPDATE ON public.approval_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();