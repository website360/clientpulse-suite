
-- Atualizar roles dos contatos para 'contato'
UPDATE user_roles 
SET role = 'contato'
WHERE user_id IN (
  '0a41b29e-ca75-460c-a81c-50eae2cc5127', -- admin@agenciamay.com
  'c28b9d60-433c-4837-99a5-a899a8d2fe65', -- funcionario002@gmail.com
  '7b707c87-0020-489d-ae1a-fe84eeb79550'  -- funcionario001@gmail.com
);
