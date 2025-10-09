import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Table as TableIcon, Download, Mail } from 'lucide-react';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientCards } from '@/components/clients/ClientCards';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Clients() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, filters]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clients];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.full_name?.toLowerCase().includes(searchLower) ||
          client.company_name?.toLowerCase().includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower) ||
          client.cpf_cnpj?.includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((client) => client.client_type === filters.type);
    }

    // Status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter((client) => client.is_active === isActive);
    }

    setFilteredClients(filtered);
  };

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setFormModalOpen(true);
  };

  const handleView = (client: any) => {
    setSelectedClient(client);
    setDetailsModalOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja desativar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente desativado',
        description: 'Cliente desativado com sucesso.',
      });
      fetchClients();
    } catch (error) {
      console.error('Error deactivating client:', error);
      toast({
        title: 'Erro ao desativar cliente',
        description: 'Não foi possível desativar o cliente.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    // Export to CSV logic
    const csv = [
      ['Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Tipo', 'Status'],
      ...filteredClients.map((client) => [
        client.full_name || client.company_name,
        client.email,
        client.phone,
        client.cpf_cnpj,
        client.client_type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica',
        client.is_active ? 'Ativo' : 'Inativo',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes.csv';
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus clientes e informações de contato
            </p>
          </div>
          <Button onClick={() => { setSelectedClient(null); setFormModalOpen(true); }} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ClientFilters filters={filters} onFiltersChange={setFilters} />
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando clientes...</p>
          </div>
        ) : viewMode === 'table' ? (
          <ClientTable
            clients={filteredClients}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        ) : (
          <ClientCards
            clients={filteredClients}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        )}

        {/* Modals */}
        <ClientFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          client={selectedClient}
          onSuccess={() => {
            fetchClients();
            setFormModalOpen(false);
            setSelectedClient(null);
          }}
        />

        <ClientDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          client={selectedClient}
        />
      </div>
    </DashboardLayout>
  );
}
