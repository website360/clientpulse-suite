-- Simplify suppliers table to only have name and link
ALTER TABLE public.suppliers 
DROP COLUMN IF EXISTS trade_name,
DROP COLUMN IF EXISTS cnpj,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address_cep,
DROP COLUMN IF EXISTS address_street,
DROP COLUMN IF EXISTS address_number,
DROP COLUMN IF EXISTS address_complement,
DROP COLUMN IF EXISTS address_neighborhood,
DROP COLUMN IF EXISTS address_city,
DROP COLUMN IF EXISTS address_state,
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS contact_email,
DROP COLUMN IF EXISTS contact_phone,
DROP COLUMN IF EXISTS notes;

-- Rename company_name to name
ALTER TABLE public.suppliers 
RENAME COLUMN company_name TO name;

-- Add link column
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS link text;