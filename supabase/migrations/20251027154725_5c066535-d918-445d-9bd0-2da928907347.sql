-- Remove a política problemática que causa recursão
DROP POLICY IF EXISTS "Contacts can view parent client" ON public.clients;

-- Criar função security definer para verificar se usuário é contato de um cliente
CREATE OR REPLACE FUNCTION public.is_contact_of_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_contacts
    WHERE user_id = _user_id
      AND client_id = _client_id
  )
$$;

-- Criar política correta usando a função security definer
CREATE POLICY "Contacts view parent client via function"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.is_contact_of_client(auth.uid(), id)
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);