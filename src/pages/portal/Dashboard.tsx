import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Ticket, FileText, Clock } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTickets: 0,
    waitingTickets: 0,
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
      let ticketsQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId);
      let waitingTicketsQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'waiting');
      
      // If user is a contact, filter by their created tickets only
      if (userIsContact) {
        ticketsQuery = ticketsQuery.eq('created_by', user?.id);
        waitingTicketsQuery = waitingTicketsQuery.eq('created_by', user?.id);
      }

      const [ticketsRes, waitingTicketsRes] = await Promise.all([
        ticketsQuery,
        waitingTicketsQuery,
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
        totalTickets: ticketsRes.count || 0,
        waitingTickets: waitingTicketsRes.count || 0,
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

        <div className={`grid gap-4 ${isContact ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <MetricCard
            title="Total de Tickets"
            value={stats.totalTickets}
            icon={Ticket}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />

          <MetricCard
            title="Aguardando"
            value={stats.waitingTickets}
            icon={Clock}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />

          {!isContact && (
            <MetricCard
              title="Contratos Ativos"
              value={stats.activeContracts}
              icon={FileText}
              variant="default"
              className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
