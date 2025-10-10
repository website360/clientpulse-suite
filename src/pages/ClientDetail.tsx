import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { TicketTable } from '@/components/tickets/TicketTable';
import { ContactFormModal } from '@/components/clients/ContactFormModal';
import { ContactsList } from '@/components/clients/ContactsList';
import { ClientDomains } from '@/components/clients/ClientDomains';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhone, formatCpfCnpj, formatCEP } from '@/lib/masks';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [breadcrumbLabel, setBreadcrumbLabel] = useState<string>('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  useEffect(() => {
    fetchClient();
    fetchClientTickets();
    fetchClientContacts();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setClient(data);
      
      // Set breadcrumb label to responsible_name (apelido)
      const label = data.responsible_name || 
        (data.client_type === 'person' ? data.full_name : data.company_name);
      setBreadcrumbLabel(label || 'Cliente');
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: 'Erro ao carregar cliente',
        description: 'Não foi possível carregar os dados do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTickets = async () => {
    try {
      setLoadingTickets(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients(full_name, company_name, email),
          departments(name, color)
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Erro ao carregar tickets',
        description: 'Não foi possível carregar os tickets do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus as 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' })
        .eq('id', ticketId);

      if (error) throw error;
      
      toast({
        title: 'Status atualizado',
        description: 'O status do ticket foi atualizado com sucesso.',
      });
      
      fetchClientTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status do ticket.',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' })
        .eq('id', ticketId);

      if (error) throw error;
      
      toast({
        title: 'Prioridade atualizada',
        description: 'A prioridade do ticket foi atualizada com sucesso.',
      });
      
      fetchClientTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a prioridade do ticket.',
        variant: 'destructive',
      });
    }
  };

  const fetchClientContacts = async () => {
    try {
      setLoadingContacts(true);
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', id)
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Erro ao carregar contatos',
        description: 'Não foi possível carregar os contatos do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    setContactFormOpen(true);
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setContactFormOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando cliente...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cliente não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel={breadcrumbLabel}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {client.responsible_name || (client.client_type === 'person' ? client.full_name : client.company_name)}
              </h1>
              <p className="text-muted-foreground mt-1">
                {client.responsible_name && (client.client_type === 'person' ? client.full_name : client.company_name)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={client.client_type === 'person' ? 'default' : 'secondary'}>
                  {client.client_type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </Badge>
                <Badge variant={client.is_active ? 'default' : 'secondary'}>
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
          <Button onClick={() => setFormModalOpen(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar Cliente
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="dominios">Domínios</TabsTrigger>
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{formatPhone(client.phone)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal/Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {client.client_type === 'person' ? 'Dados Pessoais' : 'Dados da Empresa'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.responsible_name && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Apelido</p>
                        <p className="font-medium">{client.responsible_name}</p>
                      </div>
                    </div>
                  )}
                  {client.cpf_cnpj && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {client.client_type === 'person' ? 'CPF' : 'CNPJ'}
                        </p>
                        <p className="font-medium">{formatCpfCnpj(client.cpf_cnpj)}</p>
                      </div>
                    </div>
                  )}
                  {client.birth_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                        <p className="font-medium">
                          {format(new Date(client.birth_date), 'PPP', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Info */}
              {(client.address_street || client.address_city) && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Endereço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">
                          {client.address_street}
                          {client.address_number && `, ${client.address_number}`}
                          {client.address_complement && ` - ${client.address_complement}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {client.address_neighborhood && `${client.address_neighborhood}, `}
                        {client.address_city && `${client.address_city}`}
                        {client.address_state && ` - ${client.address_state}`}
                      </p>
                      {client.address_cep && (
                        <p className="text-sm text-muted-foreground">CEP: {formatCEP(client.address_cep)}</p>
                      )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {loadingTickets ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">Carregando tickets...</p>
                </CardContent>
              </Card>
            ) : (
              <TicketTable
                tickets={tickets}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
              />
            )}
          </TabsContent>

          <TabsContent value="dominios" className="space-y-4">
            <ClientDomains clientId={id!} />
          </TabsContent>

          <TabsContent value="contatos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNewContact} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Contato
              </Button>
            </div>
            
            {loadingContacts ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">Carregando contatos...</p>
                </CardContent>
              </Card>
            ) : (
              <ContactsList
                contacts={contacts}
                onEdit={handleEditContact}
                onContactsChange={fetchClientContacts}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <ClientFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          client={client}
          onSuccess={() => {
            fetchClient();
            setFormModalOpen(false);
          }}
        />

        {/* Contact Form Modal */}
        <ContactFormModal
          open={contactFormOpen}
          onOpenChange={setContactFormOpen}
          clientId={id!}
          contact={editingContact}
          onSuccess={fetchClientContacts}
        />
      </div>
    </DashboardLayout>
  );
}
