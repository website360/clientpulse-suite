import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    waitingTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    activeContracts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Detect if user is a contact
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const userIsContact = !!contactData?.client_id;
      setIsContact(userIsContact);

      let clientId: string | null = null;

      if (userIsContact) {
        clientId = contactData!.client_id;
      } else {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();
        clientId = clientData?.id || null;
      }

      if (!clientId) return;

      // Build queries based on user type
      let waitingQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'waiting');
      let inProgressQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'in_progress');
      let resolvedQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'resolved');
      let closedQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'closed');
      
      // If user is a contact, filter by their created tickets only
      if (userIsContact) {
        waitingQuery = waitingQuery.eq('created_by', user?.id);
        inProgressQuery = inProgressQuery.eq('created_by', user?.id);
        resolvedQuery = resolvedQuery.eq('created_by', user?.id);
        closedQuery = closedQuery.eq('created_by', user?.id);
      }

      const [waitingRes, inProgressRes, resolvedRes, closedRes] = await Promise.all([
        waitingQuery,
        inProgressQuery,
        resolvedQuery,
        closedQuery,
      ]);

      let contractsCount = 0;
      if (!userIsContact && clientId) {
        const { count } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('status', 'active');
        contractsCount = count || 0;
      }

      setStats({
        waitingTickets: waitingRes.count || 0,
        inProgressTickets: inProgressRes.count || 0,
        resolvedTickets: resolvedRes.count || 0,
        closedTickets: closedRes.count || 0,
        activeContracts: contractsCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbLabel="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral dos seus serviços
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Tickets</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Aguardando"
              value={stats.waitingTickets}
              icon={Clock}
              variant="default"
              className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
            />
            <MetricCard
              title="Em Atendimento"
              value={stats.inProgressTickets}
              icon={Clock}
              variant="default"
              className="border-purple-200/50 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-purple-50 [&_.icon-wrapper]:to-purple-100/50 dark:[&_.icon-wrapper]:from-purple-950/50 dark:[&_.icon-wrapper]:to-purple-900/30 [&_.icon-wrapper_.lucide]:text-purple-600 dark:[&_.icon-wrapper_.lucide]:text-purple-400"
            />
            <MetricCard
              title="Resolvido"
              value={stats.resolvedTickets}
              icon={CheckCircle}
              variant="success"
              className="border-green-200/50 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-green-50 [&_.icon-wrapper]:to-green-100/50 dark:[&_.icon-wrapper]:from-green-950/50 dark:[&_.icon-wrapper]:to-green-900/30 [&_.icon-wrapper_.lucide]:text-green-600 dark:[&_.icon-wrapper_.lucide]:text-green-400"
            />
            <MetricCard
              title="Concluído"
              value={stats.closedTickets}
              icon={XCircle}
              variant="default"
              className="border-gray-200/50 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-gray-50 [&_.icon-wrapper]:to-gray-100/50 dark:[&_.icon-wrapper]:from-gray-950/50 dark:[&_.icon-wrapper]:to-gray-900/30 [&_.icon-wrapper_.lucide]:text-gray-600 dark:[&_.icon-wrapper_.lucide]:text-gray-400"
            />
          </div>
        </div>

        {!isContact && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Contratos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Contratos Ativos"
                value={stats.activeContracts}
                icon={FileText}
                variant="default"
                className="border-purple-200/50 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-purple-50 [&_.icon-wrapper]:to-purple-100/50 dark:[&_.icon-wrapper]:from-purple-950/50 dark:[&_.icon-wrapper]:to-purple-900/30 [&_.icon-wrapper_.lucide]:text-purple-600 dark:[&_.icon-wrapper_.lucide]:text-purple-400"
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
