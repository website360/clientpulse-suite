-- 1. Corrigir usuários existentes com role errada
UPDATE user_roles 
SET role = 'contato'
WHERE user_id IN (
  '0ceb18b9-c71e-43fa-8ec1-8cd6cebc1968', -- caiolimafrancisco@hotmail.com
  '0b56b78f-c1c2-4091-a4f9-45dc59968a15'  -- caio@caio.com.br
);

-- 2. Vincular user_id ao contato que estava NULL
UPDATE client_contacts 
SET user_id = '0ceb18b9-c71e-43fa-8ec1-8cd6cebc1968'
WHERE id = '12ea9550-56f5-4c72-a045-8e9b2f58f7cc';

-- 3. Recriar o trigger handle_new_user() para detectar contatos via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_contact BOOLEAN;
  user_role app_role;
BEGIN
  -- Verificar se é um contato baseado no user_metadata
  is_contact := COALESCE((NEW.raw_user_meta_data->>'is_contact')::boolean, false);
  
  -- Definir a role apropriada
  IF is_contact THEN
    user_role := 'contato';
  ELSE
    user_role := 'client';
  END IF;
  
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- Atribuir role correta
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;