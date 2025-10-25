import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Table as TableIcon, Download, Link2 } from 'lucide-react';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientCards } from '@/components/clients/ClientCards';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Clients() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'active',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, [filters, currentPage, pageSize, sortColumn, sortDirection]);

  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Count total matching records
      let countQuery = supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (filters.status === 'active') {
        countQuery = countQuery.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        countQuery = countQuery.eq('is_active', false);
      }

      // Apply search filter to count
      if (filters.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        countQuery = countQuery.or(`full_name.ilike.${searchLower},company_name.ilike.${searchLower},email.ilike.${searchLower},cpf_cnpj.ilike.${searchLower}`);
      }

      // Apply type filter to count
      if (filters.type !== 'all') {
        countQuery = countQuery.eq('client_type', filters.type as 'person' | 'company');
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Fetch paginated data with contacts count
      let query = supabase
        .from('clients')
        .select('*, contacts_count:client_contacts(count)');
      
      // Filter by active status
      if (filters.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Apply search filter
      if (filters.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        query = query.or(`full_name.ilike.${searchLower},company_name.ilike.${searchLower},email.ilike.${searchLower},cpf_cnpj.ilike.${searchLower}`);
      }

      // Apply type filter
      if (filters.type !== 'all') {
        query = query.eq('client_type', filters.type as 'person' | 'company');
      }

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      }
      // When no sort column is selected, we'll sort client-side by the displayed name

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort by responsible_name when no specific column is selected
      let sortedData = data || [];
      if (!sortColumn) {
        sortedData = sortedData.sort((a, b) => {
          const nameA = a.responsible_name || a.full_name || a.company_name || '';
          const nameB = b.responsible_name || b.full_name || b.company_name || '';
          return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
        });
      }
      
      setClients(sortedData);
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


  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setFormModalOpen(true);
  };

  const handleView = (client: any) => {
    navigate(`/clients/${client.id}`);
  };

  const handleDelete = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete);

      if (error) throw error;

      toast({
        title: 'Cliente excluído',
        description: 'Cliente excluído permanentemente com sucesso.',
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao excluir cliente',
        description: 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleToggleStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !currentStatus })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Status alterado',
        description: `Cliente ${!currentStatus ? 'ativado' : 'inativado'} com sucesso.`,
      });
      fetchClients();
    } catch (error) {
      console.error('Error toggling client status:', error);
      toast({
        title: 'Erro ao alterar status',
        description: 'Não foi possível alterar o status do cliente.',
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

  const handleCopyRegistrationLink = () => {
    const link = `${window.location.origin}/cadastro-cliente`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link de cadastro foi copiado para a área de transferência.',
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleCopyRegistrationLink} 
              variant="outline"
              size="lg" 
              className="gap-2"
            >
              <Link2 className="h-4 w-4" />
              Copiar Link de Cadastro
            </Button>
            <Button onClick={() => { setSelectedClient(null); setFormModalOpen(true); }} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
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
            onToggleStatus={handleToggleStatus}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Cliente Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita. O cliente será removido permanentemente do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
