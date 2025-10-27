-- Allow contacts to view their parent client record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Contacts can view parent client'
  ) THEN
    CREATE POLICY "Contacts can view parent client"
    ON public.clients
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM client_contacts cc
        WHERE cc.client_id = clients.id
          AND cc.user_id = auth.uid()
      )
    );
  END IF;
END $$;