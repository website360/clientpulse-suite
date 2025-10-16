import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseEnsureClientLinkedResult {
  clientId: string | null;
  isLoading: boolean;
  error: string | null;
  isContact: boolean;
}

export function useEnsureClientLinked(): UseEnsureClientLinkedResult {
  const { user, userRole } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    async function linkAndFetchClient() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // If user is a contact, find their client through client_contacts
        if (userRole === 'contato') {
          const { data: contactData } = await supabase
            .from('client_contacts')
            .select('client_id')
            .eq('user_id', user.id)
            .single();

          if (contactData?.client_id) {
            setClientId(contactData.client_id);
            setIsContact(true);
          } else {
            setError('Você não está associado a nenhum cliente');
          }
          setIsLoading(false);
          return;
        }

        // For clients, first try to find existing link
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingClient) {
          setClientId(existingClient.id);
          setIsLoading(false);
          return;
        }

        // If not linked, try auto-linking via edge function
        const { data: linkResult } = await supabase.functions.invoke('link-client-user');

        if (linkResult?.success && linkResult?.clientId) {
          setClientId(linkResult.clientId);
          setIsLoading(false);
          return;
        }

        // If auto-linking failed, try one more time to find by email
        const { data: clientByEmail } = await supabase
          .from('clients')
          .select('id')
          .ilike('email', user.email || '')
          .maybeSingle();

        if (clientByEmail) {
          setClientId(clientByEmail.id);
        } else {
          setError('Cliente não encontrado para este usuário');
        }
      } catch (err: any) {
        console.error('Error linking client:', err);
        setError(err.message || 'Erro ao vincular cliente');
      } finally {
        setIsLoading(false);
      }
    }

    linkAndFetchClient();
  }, [user, userRole]);

  return { clientId, isLoading, error, isContact };
}
