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

    // Total a receber (pending)
    let totalQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'pending');

    // Vencidas
    let overdueQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'pending')
      .lt('due_date', today.toISOString().split('T')[0]);

    // Recebidas este mês
    let receivedThisMonthQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'received')
      .gte('payment_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('payment_date', lastDayOfMonth.toISOString().split('T')[0]);

    // Próximas a vencer (3 dias)
    let dueSoonQuery = supabase
      .from('accounts_receivable')
      .select('amount', { count: 'exact' })
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0]);

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
