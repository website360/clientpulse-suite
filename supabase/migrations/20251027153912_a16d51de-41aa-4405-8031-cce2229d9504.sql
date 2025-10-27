-- Drop TODAS as políticas existentes de tickets (incluindo duplicadas)
DROP POLICY IF EXISTS "Admins manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can create tickets for their client" ON public.tickets;
DROP POLICY IF EXISTS "Clients can update their tickets and contacts tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can view their tickets and contacts tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients update their and contacts tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients view their and contacts tickets" ON public.tickets;
DROP POLICY IF EXISTS "Contacts can create tickets for their linked client" ON public.tickets;
DROP POLICY IF EXISTS "Contacts can update only their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Contacts can view only their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Contacts create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Contacts update only own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Contacts view only own tickets" ON public.tickets;

-- Políticas finais simplificadas

-- 1. Admins: acesso total
CREATE POLICY "admins_all"
ON public.tickets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Clientes: visualizam tickets próprios + dos contatos vinculados
CREATE POLICY "clients_select"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client')
  AND (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    created_by IN (
      SELECT cc.user_id 
      FROM client_contacts cc
      JOIN clients c ON c.id = cc.client_id
      WHERE c.user_id = auth.uid() AND cc.user_id IS NOT NULL
    )
  )
);

-- 3. Contatos: visualizam SOMENTE seus próprios tickets
CREATE POLICY "contacts_select"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
);

-- 4. Clientes: criam tickets
CREATE POLICY "clients_insert"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'client')
  AND created_by = auth.uid()
  AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- 5. Contatos: criam tickets para o cliente vinculado
CREATE POLICY "contacts_insert"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
  AND client_id IN (SELECT client_id FROM client_contacts WHERE user_id = auth.uid())
);

-- 6. Clientes: atualizam tickets próprios e de contatos
CREATE POLICY "clients_update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'client')
  AND (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    created_by IN (
      SELECT cc.user_id 
      FROM client_contacts cc
      JOIN clients c ON c.id = cc.client_id
      WHERE c.user_id = auth.uid() AND cc.user_id IS NOT NULL
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'client')
  AND (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    created_by IN (
      SELECT cc.user_id 
      FROM client_contacts cc
      JOIN clients c ON c.id = cc.client_id
      WHERE c.user_id = auth.uid() AND cc.user_id IS NOT NULL
    )
  )
);

-- 7. Contatos: atualizam SOMENTE seus próprios tickets
CREATE POLICY "contacts_update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
);