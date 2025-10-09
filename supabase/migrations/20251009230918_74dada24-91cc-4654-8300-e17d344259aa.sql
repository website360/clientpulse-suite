-- Remove the 'client' role from the user to keep only 'admin'
DELETE FROM public.user_roles 
WHERE user_id = '75789245-4500-475e-b758-80e52363f2e3' 
AND role = 'client';

-- Add a unique constraint to prevent multiple roles per user in the future
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);