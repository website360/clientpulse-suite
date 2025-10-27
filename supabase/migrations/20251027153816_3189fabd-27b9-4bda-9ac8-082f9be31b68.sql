-- Drop TODAS as políticas existentes de tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients and contacts can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients and contacts can update their tickets" ON public.tickets;

-- Política para Admins (gerenciam tudo)
CREATE POLICY "Admins manage all tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política SELECT para Clientes (veem tickets próprios + de contatos vinculados)
CREATE POLICY "Clients view their and contacts tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client')
  AND (
    -- Tickets do próprio cliente
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Tickets criados por contatos vinculados ao cliente
    created_by IN (
      SELECT cc.user_id 
      FROM client_contacts cc
      JOIN clients c ON c.id = cc.client_id
      WHERE c.user_id = auth.uid() AND cc.user_id IS NOT NULL
    )
  )
);

-- Política SELECT para Contatos (veem SOMENTE tickets próprios)
CREATE POLICY "Contacts view only own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
);

-- Política INSERT para Clientes (podem criar tickets)
CREATE POLICY "Clients create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'client')
  AND created_by = auth.uid()
  AND client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Política INSERT para Contatos (podem criar tickets para o cliente vinculado)
CREATE POLICY "Contacts create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contato')
  AND created_by = auth.uid()
  AND client_id IN (
    SELECT client_id FROM client_contacts WHERE user_id = auth.uid()
  )
);

-- Política UPDATE para Clientes (podem atualizar tickets próprios e de contatos)
CREATE POLICY "Clients update their and contacts tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'client')
  AND (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
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
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    created_by IN (
      SELECT cc.user_id 
      FROM client_contacts cc
      JOIN clients c ON c.id = cc.client_id
      WHERE c.user_id = auth.uid() AND cc.user_id IS NOT NULL
    )
  )
);

-- Política UPDATE para Contatos (podem atualizar SOMENTE tickets próprios)
CREATE POLICY "Contacts update only own tickets"
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