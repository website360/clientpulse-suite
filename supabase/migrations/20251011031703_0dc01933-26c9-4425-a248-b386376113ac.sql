-- Add is_active column to asaas_settings table
ALTER TABLE public.asaas_settings 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;