import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, FileText, Clock } from 'lucide-react';

export default function ClientDashboard() {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    activeContracts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Get client data
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Get contact data (if user is a contact)
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('id, client_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();

      const isContact = roleData?.role === 'contato';
      const clientId = clientData?.id || contactData?.client_id;

      if (!clientId) return;

      // Build queries based on user type
      let ticketsQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId);
      let openTicketsQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', clientId).neq('status', 'closed');
      
      // If user is a contact, filter by their created tickets only
      if (isContact) {
        ticketsQuery = ticketsQuery.eq('created_by', user?.id);
        openTicketsQuery = openTicketsQuery.eq('created_by', user?.id);
      }

      const [ticketsRes, openTicketsRes] = await Promise.all([
        ticketsQuery,
        openTicketsQuery,
      ]);

      let contractsCount = 0;
      if (!isContact) {
        const { count } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('status', 'active');
        contractsCount = count || 0;
      }

      setStats({
        totalTickets: ticketsRes.count || 0,
        openTickets: openTicketsRes.count || 0,
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral dos seus serviços
          </p>
        </div>

        <div className={`grid gap-4 ${userRole === 'contato' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTickets}</div>
            </CardContent>
          </Card>

          {userRole !== 'contato' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeContracts}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
