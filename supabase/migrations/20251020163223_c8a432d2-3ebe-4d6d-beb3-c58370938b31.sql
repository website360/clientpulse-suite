-- Add responsible_cpf column to clients table
ALTER TABLE public.clients
ADD COLUMN responsible_cpf text;