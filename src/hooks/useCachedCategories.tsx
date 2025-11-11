import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CachedPaymentCategory {
  id: string;
  name: string;
  type: 'payable' | 'receivable';
}

export function useCachedPaymentCategories() {
  return useQuery({
    queryKey: ['cached-payment-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_categories')
        .select('id, name, type')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
