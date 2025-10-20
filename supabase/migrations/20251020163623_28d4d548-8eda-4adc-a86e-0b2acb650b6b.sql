-- Add cpf and birth_date columns to client_contacts table
ALTER TABLE public.client_contacts
ADD COLUMN cpf text,
ADD COLUMN birth_date date;