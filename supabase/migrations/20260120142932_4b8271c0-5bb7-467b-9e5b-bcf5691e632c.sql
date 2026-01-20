-- Create whitelabel_settings table for custom branding
CREATE TABLE public.whitelabel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Primary Colors (HSL values)
  primary_h INTEGER DEFAULT 220,
  primary_s INTEGER DEFAULT 60,
  primary_l INTEGER DEFAULT 25,
  
  -- Secondary Colors (HSL values)
  secondary_h INTEGER DEFAULT 215,
  secondary_s INTEGER DEFAULT 20,
  secondary_l INTEGER DEFAULT 48,
  
  -- Status Colors (HSL string format)
  success_color VARCHAR(50) DEFAULT '160 84% 39%',
  warning_color VARCHAR(50) DEFAULT '38 92% 50%',
  error_color VARCHAR(50) DEFAULT '0 84% 60%',
  info_color VARCHAR(50) DEFAULT '188 94% 43%',
  
  -- Background Colors
  background_light VARCHAR(50) DEFAULT '0 0% 100%',
  background_dark VARCHAR(50) DEFAULT '0 0% 13%',
  
  -- Typography
  font_family VARCHAR(100) DEFAULT 'Outfit',
  font_heading VARCHAR(100) DEFAULT 'Outfit',
  
  -- Border Radius
  border_radius VARCHAR(20) DEFAULT '0.75rem',
  
  -- Company Info
  company_name VARCHAR(100) DEFAULT 'Minha Empresa',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whitelabel_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can view whitelabel settings"
ON public.whitelabel_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update whitelabel settings"
ON public.whitelabel_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert settings
CREATE POLICY "Admins can insert whitelabel settings"
ON public.whitelabel_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.whitelabel_settings (id) VALUES (gen_random_uuid());

-- Create trigger for updated_at
CREATE TRIGGER update_whitelabel_settings_updated_at
BEFORE UPDATE ON public.whitelabel_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();