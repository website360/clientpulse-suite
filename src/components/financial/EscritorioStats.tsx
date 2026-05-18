import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';

interface Props {
  /** Filtros do período. Se omitido (modo geral), agrega todo o histórico. */
  filters?: {
    status: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
  /** Texto opcional acima dos cards (ex.: "Indicadores gerais"). */
  heading?: string;
}

/**
 * Indicadores simplificados para conta tipo escritório:
 * Entradas, Saídas, Saldo. Filtra por payment_date (já que tudo entra
 * liquidado) e pela conta selecionada. Em modo geral (sem filters),
 * agrega todo o histórico da conta.
 */
export function EscritorioStats({ filters, heading }: Props) {
  const { selectedAccountId } = useFinancialAccount();
  const [stats, setStats] = useState({ entradas: 0, saidas: 0 });

  // memoize filter dependency
  const dateFrom = filters?.dateFrom || '';
  const dateTo = filters?.dateTo || '';
  const search = filters?.search || '';
  const category = filters?.category || 'all';

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo, search, category, selectedAccountId]);

  const fetchStats = async () => {
    // Entradas: receivable status=received
    let entradasQuery = supabase
      .from('accounts_receivable')
      .select('amount')
      .eq('status', 'received');
    if (selectedAccountId !== 'all') {
      entradasQuery = entradasQuery.eq('financial_account_id', selectedAccountId);
    }
    if (filters) {
      if (filters.dateFrom) entradasQuery = entradasQuery.gte('payment_date', filters.dateFrom);
      if (filters.dateTo) entradasQuery = entradasQuery.lte('payment_date', filters.dateTo);
      if (filters.search) entradasQuery = entradasQuery.ilike('description', `%${filters.search}%`);
      if (filters.category !== 'all') entradasQuery = entradasQuery.eq('category', filters.category);
    }

    // Saídas: payable status=paid
    let saidasQuery = supabase
      .from('accounts_payable')
      .select('amount')
      .eq('status', 'paid');
    if (selectedAccountId !== 'all') {
      saidasQuery = saidasQuery.eq('financial_account_id', selectedAccountId);
    }
    if (filters) {
      if (filters.dateFrom) saidasQuery = saidasQuery.gte('payment_date', filters.dateFrom);
      if (filters.dateTo) saidasQuery = saidasQuery.lte('payment_date', filters.dateTo);
      if (filters.search) saidasQuery = saidasQuery.ilike('description', `%${filters.search}%`);
      if (filters.category !== 'all') saidasQuery = saidasQuery.eq('category', filters.category);
    }

    const [entradasRes, saidasRes] = await Promise.all([entradasQuery, saidasQuery]);

    const entradas = entradasRes.data?.reduce((s, r) => s + Number(r.amount), 0) || 0;
    const saidas = saidasRes.data?.reduce((s, r) => s + Number(r.amount), 0) || 0;

    setStats({ entradas, saidas });
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const saldo = stats.entradas - stats.saidas;

  return (
    <div className="space-y-2">
      {heading && (
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {heading}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="Entradas"
        value={formatCurrency(stats.entradas)}
        icon={TrendingUp}
        variant="success"
        className="bg-gradient-to-br from-card to-card/50"
      />
      <MetricCard
        title="Saídas"
        value={formatCurrency(stats.saidas)}
        icon={TrendingDown}
        variant="destructive"
        className="bg-gradient-to-br from-card to-card/50"
      />
      <MetricCard
        title="Saldo"
        value={formatCurrency(saldo)}
        icon={Wallet}
        variant={saldo >= 0 ? 'success' : 'destructive'}
        className="bg-gradient-to-br from-card to-card/50"
      />
      </div>
    </div>
  );
}
