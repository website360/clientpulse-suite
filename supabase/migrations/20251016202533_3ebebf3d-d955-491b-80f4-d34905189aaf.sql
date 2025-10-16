-- Atualizar o contato para vincular ao user_id correto
UPDATE client_contacts
SET user_id = '0ceb18b9-c71e-43fa-8ec1-8cd6cebc1968'
WHERE email = 'caiolimafrancisco@hotmail.com' AND user_id IS NULL;