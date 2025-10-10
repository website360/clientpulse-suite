-- Add nickname column to clients table
ALTER TABLE public.clients
ADD COLUMN nickname text;