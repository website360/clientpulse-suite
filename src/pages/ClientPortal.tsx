import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Ticket, FileText, Plus } from 'lucide-react';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClientData();
      fetchTickets();
      fetchContracts();
    }
  }, [user]);

  const fetchClientData = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: 'Cliente não encontrado',
          description: 'Não foi possível encontrar seus dados de cliente.',
          variant: 'destructive',
        });
        return;
      }
      
      setClient(data);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar seus dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          departments(name, color)
        `)
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          services(name),
          payment_methods(name)
        `)
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: { variant: 'default', label: 'Aberto' },
      in_progress: { variant: 'secondary', label: 'Em Progresso' },
      waiting: { variant: 'outline', label: 'Aguardando' },
      resolved: { variant: 'default', label: 'Resolvido' },
      closed: { variant: 'secondary', label: 'Fechado' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: { variant: 'secondary', label: 'Baixa' },
      medium: { variant: 'default', label: 'Média' },
      high: { variant: 'outline', label: 'Alta' },
      urgent: { variant: 'destructive', label: 'Urgente' },
    };
    const config = variants[priority] || { variant: 'default', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getContractStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending_signature: { variant: 'outline', label: 'Aguardando Assinatura' },
      active: { variant: 'default', label: 'Ativo' },
      expired: { variant: 'destructive', label: 'Vencido' },
      completed: { variant: 'secondary', label: 'Concluído' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel="Portal do Cliente">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Bem-vindo, {client?.responsible_name || client?.full_name || client?.company_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus tickets e contratos
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              Contratos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tickets Abertos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tickets.filter(t => t.status === 'open').length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contratos Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {contracts.filter(c => c.status === 'active').length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total de Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{tickets.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tickets Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">#{ticket.ticket_number} - {ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">{ticket.departments?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum ticket encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={() => setNewTicketOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Ticket
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Meus Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{ticket.ticket_number}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{ticket.subject}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{ticket.departments?.name}</span>
                              <span>•</span>
                              <span>{format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tickets.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">
                      Você ainda não tem tickets. Clique em "Novo Ticket" para criar um.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Meus Contratos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts.map((contract) => (
                    <Card key={contract.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{contract.services?.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Valor</p>
                                <p className="font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(contract.amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Forma de Pagamento</p>
                                <p className="font-medium">{contract.payment_methods?.name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Data de Início</p>
                                <p className="font-medium">
                                  {format(new Date(contract.start_date), "dd/MM/yyyy")}
                                </p>
                              </div>
                              {contract.end_date && (
                                <div>
                                  <p className="text-muted-foreground">Data de Término</p>
                                  <p className="font-medium">
                                    {format(new Date(contract.end_date), "dd/MM/yyyy")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            {getContractStatusBadge(contract.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {contracts.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">
                      Nenhum contrato encontrado.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {client && (
        <NewTicketModal
          open={newTicketOpen}
          onOpenChange={setNewTicketOpen}
          onSuccess={() => {
            fetchTickets();
            setNewTicketOpen(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}

