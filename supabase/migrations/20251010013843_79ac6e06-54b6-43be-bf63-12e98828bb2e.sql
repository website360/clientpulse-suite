-- Adicionar campo nickname (apelido) na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;