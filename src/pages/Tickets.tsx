import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Table as TableIcon, Download } from 'lucide-react';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketKanban } from '@/components/tickets/TicketKanban';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Tickets() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    department: 'all',
  });
  const { toast } = useToast();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients (full_name, company_name, email),
          departments (name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Erro ao carregar tickets',
        description: 'Não foi possível carregar a lista de tickets.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket_number?.toString().includes(searchLower) ||
          ticket.subject?.toLowerCase().includes(searchLower) ||
          ticket.description?.toLowerCase().includes(searchLower) ||
          ticket.clients?.full_name?.toLowerCase().includes(searchLower) ||
          ticket.clients?.company_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === filters.priority);
    }

    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter((ticket) => ticket.department_id === filters.department);
    }

    setFilteredTickets(filtered);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'Status do ticket atualizado com sucesso.',
      });
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do ticket.',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(newPriority)) return;

      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Prioridade atualizada',
        description: 'Prioridade do ticket atualizada com sucesso.',
      });
      fetchTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Erro ao atualizar prioridade',
        description: 'Não foi possível atualizar a prioridade do ticket.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const csv = [
      ['#', 'Assunto', 'Cliente', 'Departamento', 'Prioridade', 'Status', 'Data de Criação'],
      ...filteredTickets.map((ticket) => [
        ticket.ticket_number,
        ticket.subject,
        ticket.clients?.full_name || ticket.clients?.company_name,
        ticket.departments?.name,
        ticket.priority,
        ticket.status,
        new Date(ticket.created_at).toLocaleDateString('pt-BR'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tickets.csv';
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os tickets de suporte
            </p>
          </div>
          {userRole === 'admin' && (
            <Button onClick={() => setNewTicketModalOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Ticket
            </Button>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <TicketFilters filters={filters} onFiltersChange={setFilters} />
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
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
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{filteredTickets.length}</p>
          </div>
          <div className="p-4 rounded-lg border-2 border-blue-500/40 bg-blue-500/10">
            <p className="text-sm text-blue-700">Aberto</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredTickets.filter((t) => t.status === 'open').length}
            </p>
          </div>
          <div className="p-4 rounded-lg border-2 border-amber-500/40 bg-amber-500/10">
            <p className="text-sm text-amber-700">Em Andamento</p>
            <p className="text-2xl font-bold text-amber-600">
              {filteredTickets.filter((t) => t.status === 'in_progress').length}
            </p>
          </div>
          <div className="p-4 rounded-lg border-2 border-purple-500/40 bg-purple-500/10">
            <p className="text-sm text-purple-700">Aguardando</p>
            <p className="text-2xl font-bold text-purple-600">
              {filteredTickets.filter((t) => t.status === 'waiting').length}
            </p>
          </div>
          <div className="p-4 rounded-lg border-2 border-green-600/40 bg-green-600/10">
            <p className="text-sm text-green-700">Resolvido</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredTickets.filter((t) => t.status === 'resolved').length}
            </p>
          </div>
          <div className="p-4 rounded-lg border-2 border-gray-500/40 bg-gray-500/10">
            <p className="text-sm text-gray-700">Fechado</p>
            <p className="text-2xl font-bold text-gray-600">
              {filteredTickets.filter((t) => t.status === 'closed').length}
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando tickets...</p>
          </div>
        ) : viewMode === 'table' ? (
          <TicketTable
            tickets={filteredTickets}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />
        ) : (
          <TicketKanban
            tickets={filteredTickets}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* New Ticket Modal */}
        <NewTicketModal
          open={newTicketModalOpen}
          onOpenChange={setNewTicketModalOpen}
          onSuccess={() => {
            fetchTickets();
            setNewTicketModalOpen(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
