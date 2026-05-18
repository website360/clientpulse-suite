import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialAccount {
  id: string;
  name: string;
  type: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

// "all" representa a visão consolidada (todas as contas)
export type SelectedAccount = string | 'all';

interface FinancialAccountContextType {
  accounts: FinancialAccount[];
  selectedAccountId: SelectedAccount;
  setSelectedAccountId: (id: SelectedAccount) => void;
  selectedAccount: FinancialAccount | null;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

const STORAGE_KEY = 'financial_selected_account';

const FinancialAccountContext = createContext<FinancialAccountContextType | undefined>(undefined);

export function FinancialAccountProvider({ children }: { children: React.ReactNode }) {
  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as FinancialAccount[];
    },
    staleTime: 60_000,
  });

  const [selectedAccountId, setSelectedAccountIdState] = useState<SelectedAccount>(() => {
    return (localStorage.getItem(STORAGE_KEY) as SelectedAccount) || 'all';
  });

  // Se a conta salva não existir mais (renomeada/desativada/deletada), cai para default ou 'all'
  useEffect(() => {
    if (isLoading || accounts.length === 0) return;
    if (selectedAccountId !== 'all' && !accounts.find((a) => a.id === selectedAccountId)) {
      const fallback = accounts.find((a) => a.is_default)?.id || 'all';
      setSelectedAccountIdState(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [accounts, isLoading, selectedAccountId]);

  const setSelectedAccountId = (id: SelectedAccount) => {
    setSelectedAccountIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const value: FinancialAccountContextType = {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    isLoading,
    refetch,
  };

  return (
    <FinancialAccountContext.Provider value={value}>
      {children}
    </FinancialAccountContext.Provider>
  );
}

export function useFinancialAccount() {
  const ctx = useContext(FinancialAccountContext);
  if (!ctx) throw new Error('useFinancialAccount must be used inside FinancialAccountProvider');
  return ctx;
}
