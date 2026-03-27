import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, User, Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { TicketTable } from '@/components/tickets/TicketTable';
import { ContactFormModal } from '@/components/clients/ContactFormModal';
import { ContactsList } from '@/components/clients/ContactsList';
import { ClientDomains } from '@/components/clients/ClientDomains';
import { ContractTable } from '@/components/contracts/ContractTable';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { ClientMaintenanceTab } from '@/components/clients/ClientMaintenanceTab';
import { ClientFinancialTab } from '@/components/clients/ClientFinancialTab';
import { ClientAccessesTab } from '@/components/clients/ClientAccessesTab';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
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
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  useEffect(() => {
    fetchClient();
    fetchClientTickets();
    fetchClientContacts();
    fetchClientContracts();
    fetchClientProjects();
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
      
      // Set breadcrumb label to nickname for company, full_name for person
      const label = data.client_type === 'person' ? data.full_name : data.responsible_name;
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

  // Remover handleStatusChange completamente

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

  const fetchClientProjects = async () => {
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            full_name,
            company_name,
            nickname
          ),
          project_types (
            name,
            color
          )
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Erro ao carregar projetos',
        description: 'Não foi possível carregar os projetos do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setProjectFormOpen(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setProjectFormOpen(true);
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
                {client.client_type === 'person' ? client.responsible_name : client.responsible_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {client.client_type === 'person' ? client.full_name : client.company_name}
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
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="dominios">Domínios</TabsTrigger>
            <TabsTrigger value="acessos">Acessos</TabsTrigger>
            <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Contact Info */}
              <div className="rounded-xl border bg-card">
                <div className="px-6 py-4 border-b">
                  <span className="text-sm font-semibold text-foreground">Informações de Contato</span>
                </div>
                <div>
                  <div className="flex items-center gap-3 px-6 py-3.5 border-b">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Email</p>
                      <p className="text-[13px] font-medium text-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Telefone</p>
                      <p className="text-[13px] font-medium text-foreground">{formatPhone(client.phone)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal/Company Info */}
              <div className="rounded-xl border bg-card">
                <div className="px-6 py-4 border-b">
                  <span className="text-sm font-semibold text-foreground">
                    {client.client_type === 'person' ? 'Dados Pessoais' : 'Dados da Empresa'}
                  </span>
                </div>
                <div>
                  {client.client_type === 'company' && client.company_name && (
                    <div className="flex items-center gap-3 px-6 py-3.5 border-b">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Nome da Empresa</p>
                        <p className="text-[13px] font-medium text-foreground">{client.company_name}</p>
                      </div>
                    </div>
                  )}
                  {client.client_type === 'person' && client.full_name && (
                    <div className="flex items-center gap-3 px-6 py-3.5 border-b">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Nome Completo</p>
                        <p className="text-[13px] font-medium text-foreground">{client.full_name}</p>
                      </div>
                    </div>
                  )}
                  {client.cpf_cnpj && (
                    <div className="flex items-center gap-3 px-6 py-3.5 border-b">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          {client.client_type === 'person' ? 'CPF' : 'CNPJ'}
                        </p>
                        <p className="text-[13px] font-medium text-foreground">{formatCpfCnpj(client.cpf_cnpj)}</p>
                      </div>
                    </div>
                  )}
                  {client.client_type === 'person' && client.birth_date && (
                    <div className="flex items-center gap-3 px-6 py-3.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Data de Nascimento</p>
                        <p className="text-[13px] font-medium text-foreground">
                          {format(new Date(client.birth_date), 'PPP', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* System Access */}
              <div className="rounded-xl border bg-card md:col-span-2">
                <div className="px-6 py-4 border-b">
                  <span className="text-sm font-semibold text-foreground">Acesso ao Sistema</span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="system-access" className="text-[13px] font-medium">Habilitar acesso ao sistema</Label>
                      <p className="text-[11px] text-muted-foreground">
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
                        <Label htmlFor="password" className="text-[13px]">Senha de Acesso *</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={savingAccess}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Email de login: {client.email}
                        </p>
                      </div>
                      <Button
                        onClick={handleCreateSystemAccess}
                        disabled={savingAccess || !password}
                        size="sm"
                      >
                        {savingAccess ? 'Criando acesso...' : 'Criar Acesso'}
                      </Button>
                    </div>
                  )}

                  {systemAccessEnabled && client.user_id && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Acesso ativo</Badge>
                        <p className="text-[11px] text-muted-foreground">
                          Cliente pode fazer login com: {client.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Info */}
              {(client.address_street || client.address_city) && (
                <div className="rounded-xl border bg-card md:col-span-2">
                  <div className="px-6 py-4 border-b">
                    <span className="text-sm font-semibold text-foreground">Endereço</span>
                  </div>
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {client.address_street}
                          {client.address_number && `, ${client.address_number}`}
                          {client.address_complement && ` - ${client.address_complement}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {client.address_neighborhood && `${client.address_neighborhood}, `}
                          {client.address_city && `${client.address_city}`}
                          {client.address_state && ` - ${client.address_state}`}
                        </p>
                        {client.address_cep && (
                          <p className="text-[11px] text-muted-foreground">CEP: {formatCEP(client.address_cep)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-6">
            {loadingTickets ? (
              <div className="rounded-xl border bg-card text-center py-12">
                <p className="text-[13px] text-muted-foreground">Carregando tickets...</p>
              </div>
            ) : (
              <TicketTable
                tickets={tickets}
                onPriorityChange={handlePriorityChange}
                hideClientColumn={true}
              />
            )}
          </TabsContent>

          <TabsContent value="projetos" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={handleNewProject} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Projeto
              </Button>
            </div>
            
            {loadingProjects ? (
              <div className="rounded-xl border bg-card text-center py-12">
                <p className="text-[13px] text-muted-foreground">Carregando projetos...</p>
              </div>
            ) : (
              <ProjectTable
                projects={projects}
                isLoading={loadingProjects}
                onEdit={handleEditProject}
                onRefresh={fetchClientProjects}
                hideClientColumn={true}
              />
            )}
          </TabsContent>

          <TabsContent value="contratos" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={handleNewContract} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Contrato
              </Button>
            </div>
            
            {loadingContracts ? (
              <div className="rounded-xl border bg-card text-center py-12">
                <p className="text-[13px] text-muted-foreground">Carregando contratos...</p>
              </div>
            ) : (
              <ContractTable
                contracts={contracts}
                onEdit={handleEditContract}
                onRefresh={fetchClientContracts}
                sortColumn={null}
                sortDirection="asc"
                onSort={() => {}}
                hideClientColumn={true}
              />
            )}
          </TabsContent>

          <TabsContent value="dominios" className="space-y-4 mt-6">
            <ClientDomains clientId={id!} />
          </TabsContent>

          <TabsContent value="acessos" className="space-y-4 mt-6">
            <ClientAccessesTab clientId={id!} />
          </TabsContent>

          <TabsContent value="manutencao" className="space-y-4 mt-6">
            <ClientMaintenanceTab clientId={id!} />
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4 mt-6">
            <ClientFinancialTab clientId={id!} />
          </TabsContent>

          <TabsContent value="contatos" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={handleNewContact} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Contato
              </Button>
            </div>
            
            {loadingContacts ? (
              <div className="rounded-xl border bg-card text-center py-12">
                <p className="text-[13px] text-muted-foreground">Carregando contatos...</p>
              </div>
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

        {/* Project Form Modal */}
        <ProjectFormModal
          open={projectFormOpen}
          onClose={() => {
            setProjectFormOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
          clientId={id} // Passa o ID do cliente para pré-selecionar
          onSuccess={() => {
            fetchClientProjects();
            setProjectFormOpen(false);
            setEditingProject(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
