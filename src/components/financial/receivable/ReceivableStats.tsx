import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    receivedThisMonth: 0,
    dueSoon: 0
  });

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Apply common filters
    const applyFilters = (query: any) => {
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

    // Total a receber (pending or based on filter status)
    let totalQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' });
    
    if (filters.status === 'all') {
      totalQuery = totalQuery.eq('status', 'pending');
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
      .eq('status', 'received');
    
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total a Receber"
        value={formatCurrency(stats.total)}
        icon={DollarSign}
        className="bg-card"
      />
      <MetricCard
        title="Contas Vencidas"
        value={formatCurrency(stats.overdue)}
        icon={AlertCircle}
        className="bg-card"
      />
      <MetricCard
        title="Recebidas Este Mês"
        value={formatCurrency(stats.receivedThisMonth)}
        icon={CheckCircle}
        className="bg-card"
      />
      <MetricCard
        title="Vencem em 3 Dias"
        value={formatCurrency(stats.dueSoon)}
        icon={Clock}
        className="bg-card"
      />
    </div>
  );
}
