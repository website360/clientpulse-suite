-- Corrigir vínculo do cliente "Agencia May" com o usuário correto
UPDATE clients
SET user_id = '027e5c8e-6dac-41d5-85cf-6128b65b912e'
WHERE email = 'caio@agenciamay.com.br';

-- Garantir que o contato caiolimafrancisco@hotmail.com está vinculado ao cliente correto
-- Primeiro, buscar o ID do cliente "Agencia May"
DO $$
DECLARE
  agencia_may_client_id UUID;
  contato_exists BOOLEAN;
BEGIN
  -- Buscar o ID do cliente
  SELECT id INTO agencia_may_client_id
  FROM clients
  WHERE email = 'caio@agenciamay.com.br'
  LIMIT 1;

  -- Verificar se o contato já existe
  SELECT EXISTS (
    SELECT 1 FROM client_contacts
    WHERE email = 'caiolimafrancisco@hotmail.com'
  ) INTO contato_exists;

  -- Se o cliente foi encontrado
  IF agencia_may_client_id IS NOT NULL THEN
    -- Se o contato não existe, criar
    IF NOT contato_exists THEN
      INSERT INTO client_contacts (client_id, name, email, department)
      VALUES (
        agencia_may_client_id,
        'Caio Lima Francisco',
        'caiolimafrancisco@hotmail.com',
        'Geral'
      );
    ELSE
      -- Se existe, atualizar o client_id para garantir vínculo correto
      UPDATE client_contacts
      SET client_id = agencia_may_client_id
      WHERE email = 'caiolimafrancisco@hotmail.com';
    END IF;
  END IF;
END $$;