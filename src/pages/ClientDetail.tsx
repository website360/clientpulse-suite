import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, User, Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStatusUpdateData } from '@/lib/tickets';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { TicketTable } from '@/components/tickets/TicketTable';
import { ContactFormModal } from '@/components/clients/ContactFormModal';
import { ContactsList } from '@/components/clients/ContactsList';
import { ClientDomains } from '@/components/clients/ClientDomains';
import { ContractTable } from '@/components/contracts/ContractTable';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { ClientMaintenanceTab } from '@/components/clients/ClientMaintenanceTab';
import { ClientFinancialTab } from '@/components/clients/ClientFinancialTab';
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
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [systemAccessEnabled, setSystemAccessEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    fetchClient();
    fetchClientTickets();
    fetchClientContacts();
    fetchClientContracts();
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
      
      // Check if client has system access (user_id is set)
      setSystemAccessEnabled(!!data.user_id);
      
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
      const updateData = getStatusUpdateData(newStatus);

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
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

  const fetchClientContracts = async () => {
    try {
      setLoadingContracts(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients (
            full_name,
            company_name,
            nickname
          ),
          services (
            name
          ),
          payment_methods (
            name
          )
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: 'Erro ao carregar contratos',
        description: 'Não foi possível carregar os contratos do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleEditContract = (contract: any) => {
    setEditingContract(contract);
    setContractFormOpen(true);
  };

  const handleNewContract = () => {
    setEditingContract(null);
    setContractFormOpen(true);
  };

  const handleSystemAccessToggle = async (enabled: boolean) => {
    if (!enabled && client.user_id) {
      // Disable access - remove user_id
      try {
        const { error } = await supabase
          .from('clients')
          .update({ user_id: null })
          .eq('id', id);

        if (error) throw error;

        setSystemAccessEnabled(false);
        setPassword('');
        toast({
          title: 'Acesso desabilitado',
          description: 'O acesso ao sistema foi removido para este cliente.',
        });
        fetchClient();
      } catch (error) {
        console.error('Error disabling access:', error);
        toast({
          title: 'Erro ao desabilitar',
          description: 'Não foi possível remover o acesso ao sistema.',
          variant: 'destructive',
        });
      }
    } else {
      // Just toggle the switch, password will be required to enable
      setSystemAccessEnabled(enabled);
      if (!enabled) {
        setPassword('');
      }
    }
  };

  const handleCreateSystemAccess = async () => {
    if (!password || password.length < 6) {
      toast({
        title: 'Senha inválida',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAccess(true);

      // Call edge function to create user (doesn't logout current user)
      const { data, error } = await supabase.functions.invoke('create-client-user', {
        body: {
          email: client.email,
          password: password,
          fullName: client.client_type === 'person' ? client.full_name : client.company_name,
          clientId: id,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao criar acesso');
      }

      if (data?.error) {
        toast({
          title: data.error,
          description: data.message || 'Não foi possível criar acesso ao sistema.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Acesso criado',
        description: 'O cliente agora pode acessar o sistema com email e senha.',
      });

      setPassword('');
      fetchClient();
    } catch (error: any) {
      console.error('Error creating system access:', error);
      toast({
        title: 'Erro ao criar acesso',
        description: error.message || 'Não foi possível criar acesso ao sistema.',
        variant: 'destructive',
      });
    } finally {
      setSavingAccess(false);
    }
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
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="dominios">Domínios</TabsTrigger>
            <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
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

              {/* System Access */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Acesso ao Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="system-access">Habilitar acesso ao sistema</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que o cliente acesse o sistema como usuário
                      </p>
                    </div>
                    <Switch
                      id="system-access"
                      checked={systemAccessEnabled}
                      onCheckedChange={handleSystemAccessToggle}
                      disabled={savingAccess}
                    />
                  </div>

                  {systemAccessEnabled && !client.user_id && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha de Acesso *</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={savingAccess}
                        />
                        <p className="text-xs text-muted-foreground">
                          Email de login: {client.email}
                        </p>
                      </div>
                      <Button
                        onClick={handleCreateSystemAccess}
                        disabled={savingAccess || !password}
                      >
                        {savingAccess ? 'Criando acesso...' : 'Criar Acesso'}
                      </Button>
                    </div>
                  )}

                  {systemAccessEnabled && client.user_id && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Acesso ativo</Badge>
                        <p className="text-sm text-muted-foreground">
                          Cliente pode fazer login com: {client.email}
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

          <TabsContent value="contratos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNewContract} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Contrato
              </Button>
            </div>
            
            {loadingContracts ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">Carregando contratos...</p>
                </CardContent>
              </Card>
            ) : (
              <ContractTable
                contracts={contracts}
                onEdit={handleEditContract}
                onRefresh={fetchClientContracts}
                sortColumn={null}
                sortDirection="asc"
                onSort={() => {}}
              />
            )}
          </TabsContent>

          <TabsContent value="dominios" className="space-y-4">
            <ClientDomains clientId={id!} />
          </TabsContent>

          <TabsContent value="manutencao" className="space-y-4">
            <ClientMaintenanceTab clientId={id!} />
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4">
            <ClientFinancialTab clientId={id!} />
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

        {/* Contract Form Modal */}
        <ContractFormModal
          isOpen={contractFormOpen}
          onClose={() => {
            setContractFormOpen(false);
            setEditingContract(null);
          }}
          onSuccess={() => {
            fetchClientContracts();
            setContractFormOpen(false);
            setEditingContract(null);
          }}
          contract={editingContract}
        />
      </div>
    </DashboardLayout>
  );
}
