import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';
import { RECEIVED_STATUSES } from '@/lib/statusBadge';

interface ReceivableStatsProps {
  filters: {
    status: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
}

export function ReceivableStats({ filters }: ReceivableStatsProps) {
  const { selectedAccountId, selectedAccount } = useFinancialAccount();
  // Em escritório os lançamentos entram já como 'received', então os widgets
  // que filtram por 'pending' zeram. Aqui usamos 'received' como total nesse caso.
  const isEscritorio = selectedAccount?.type === 'escritorio';
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    receivedThisMonth: 0,
    dueSoon: 0
  });

  useEffect(() => {
    fetchStats();
  }, [filters, selectedAccountId, isEscritorio]);

  const fetchStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Apply common filters
    const applyFilters = (query: any) => {
      if (selectedAccountId !== 'all') {
        query = query.eq('financial_account_id', selectedAccountId);
      }
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }
      return query;
    };

    // "Total" — em escritório usa 'received' (já liquidado), caso contrário usa 'pending'
    let totalQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' });

    if (filters.status === 'all') {
      totalQuery = totalQuery.eq('status', isEscritorio ? 'received' : 'pending');
    } else if (filters.status === 'received') {
      totalQuery = totalQuery.in('status', [...RECEIVED_STATUSES]);
    } else {
      totalQuery = totalQuery.eq('status', filters.status as any);
    }
    totalQuery = applyFilters(totalQuery);

    // Vencidas
    let overdueQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'pending')
      .lt('due_date', today.toISOString().split('T')[0]);
    overdueQuery = applyFilters(overdueQuery);

    // Recebidas no período dos filtros (ou este mês se não houver filtro de data)
    let receivedThisMonthQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .in('status', [...RECEIVED_STATUSES]);
    
    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) {
        receivedThisMonthQuery = receivedThisMonthQuery.gte('payment_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        receivedThisMonthQuery = receivedThisMonthQuery.lte('payment_date', filters.dateTo);
      }
    } else {
      receivedThisMonthQuery = receivedThisMonthQuery
        .gte('payment_date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('payment_date', lastDayOfMonth.toISOString().split('T')[0]);
    }
    
    if (selectedAccountId !== 'all') {
      receivedThisMonthQuery = receivedThisMonthQuery.eq('financial_account_id', selectedAccountId);
    }
    if (filters.category !== 'all') {
      receivedThisMonthQuery = receivedThisMonthQuery.eq('category', filters.category);
    }
    if (filters.search) {
      receivedThisMonthQuery = receivedThisMonthQuery.ilike('description', `%${filters.search}%`);
    }

    // Próximas a vencer (3 dias)
    let dueSoonQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0]);
    dueSoonQuery = applyFilters(dueSoonQuery);

    const [totalRes, overdueRes, receivedRes, dueSoonRes] = await Promise.all([
      totalQuery,
      overdueQuery,
      receivedThisMonthQuery,
      dueSoonQuery
    ]);

    const totalAmount = totalRes.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const overdueAmount = overdueRes.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const receivedAmount = receivedRes.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const dueSoonAmount = dueSoonRes.data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    setStats({
      total: totalAmount,
      overdue: overdueAmount,
      receivedThisMonth: receivedAmount,
      dueSoon: dueSoonAmount
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isEscritorio) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total Recebido"
          value={formatCurrency(stats.total)}
          icon={DollarSign}
          variant="success"
          className="bg-gradient-to-br from-card to-card/50"
        />
        <MetricCard
          title="Recebidas Este Mês"
          value={formatCurrency(stats.receivedThisMonth)}
          icon={CheckCircle}
          variant="success"
          className="bg-gradient-to-br from-card to-card/50"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total a Receber"
        value={formatCurrency(stats.total)}
        icon={DollarSign}
        variant="default"
        className="bg-gradient-to-br from-card to-card/50"
      />
      <MetricCard
        title="Recebidas Este Mês"
        value={formatCurrency(stats.receivedThisMonth)}
        icon={CheckCircle}
        variant="success"
        className="bg-gradient-to-br from-card to-card/50"
      />
      <MetricCard
        title="Vencem em 3 Dias"
        value={formatCurrency(stats.dueSoon)}
        icon={Clock}
        variant="default"
        className="bg-gradient-to-br from-card to-card/50"
      />
      <MetricCard
        title="Contas Vencidas"
        value={formatCurrency(stats.overdue)}
        icon={AlertCircle}
        variant="destructive"
        className="bg-gradient-to-br from-card to-card/50"
      />
    </div>
  );
}
