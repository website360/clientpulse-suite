import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CachedClient {
  id: string;
  full_name: string;
  company_name: string;
  responsible_name: string;
  client_type: 'person' | 'company';
}

export function useCachedClients() {
  return useQuery({
    queryKey: ['cached-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, company_name, responsible_name, client_type')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
