import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Table as TableIcon, Download, Ticket, Clock, CheckCircle, XCircle } from 'lucide-react';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketKanban } from '@/components/tickets/TicketKanban';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TablePagination } from '@/components/ui/table-pagination';
import { useClientPagination } from '@/hooks/useClientPagination';
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
import { useAuth } from '@/contexts/AuthContext';

export default function Tickets() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    department: 'all',
  });
  const { toast } = useToast();
  const { userRole } = useAuth();

  // Apply sorting to filtered tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Client-side pagination for sorted tickets
  const {
    paginatedItems: paginatedTickets,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useClientPagination(sortedTickets, 100);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients (full_name, company_name, email),
          departments (name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Buscar última mensagem de cada ticket
        const ticketIds = ticketsData?.map(t => t.id) || [];
        
        const { data: lastMessages } = await supabase
          .from('ticket_messages')
          .select('ticket_id, created_at, user_id')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false });

        const { data: ticketViews } = await supabase
          .from('ticket_views')
          .select('ticket_id, last_viewed_at')
          .in('ticket_id', ticketIds)
          .eq('user_id', user.id);

        // Mapear última mensagem por ticket
        const lastMessageMap = new Map();
        lastMessages?.forEach(msg => {
          if (!lastMessageMap.has(msg.ticket_id)) {
            lastMessageMap.set(msg.ticket_id, { created_at: msg.created_at, user_id: msg.user_id });
          }
        });

        // Mapear última visualização por ticket
        const viewsMap = new Map();
        ticketViews?.forEach(view => {
          viewsMap.set(view.ticket_id, view.last_viewed_at);
        });

        // Adicionar flag de não lido
        const ticketsWithUnread = ticketsData?.map(ticket => {
          const lastMessage = lastMessageMap.get(ticket.id);
          const lastViewDate = viewsMap.get(ticket.id);
          
          // Só mostrar como não lido se a última mensagem foi de OUTRA pessoa (não do usuário logado)
          const hasUnread = lastMessage && 
                           lastMessage.user_id !== user.id && 
                           (!lastViewDate || new Date(lastMessage.created_at) > new Date(lastViewDate));
          
          return {
            ...ticket,
            hasUnread
          };
        });

        setTickets(ticketsWithUnread || []);
      } else {
        setTickets(ticketsData || []);
      }
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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

  const handleDelete = (ticketId: string) => {
    setTicketToDelete(ticketId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    try {
      // Primeiro, remover a referência ticket_id das tarefas vinculadas
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ ticket_id: null })
        .eq('ticket_id', ticketToDelete);

      if (taskUpdateError) {
        console.error('Error updating tasks:', taskUpdateError);
      }

      // Depois, excluir o ticket
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketToDelete);

      if (error) throw error;

      toast({
        title: 'Ticket excluído',
        description: 'Ticket excluído com sucesso.',
      });
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Erro ao excluir ticket',
        description: 'Não foi possível excluir o ticket.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total"
            value={filteredTickets.length}
            icon={Ticket}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Aberto"
            value={filteredTickets.filter((t) => t.status === 'open').length}
            icon={Ticket}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Em Andamento"
            value={filteredTickets.filter((t) => t.status === 'in_progress').length}
            icon={Clock}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Aguardando"
            value={filteredTickets.filter((t) => t.status === 'waiting').length}
            icon={Clock}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Resolvido"
            value={filteredTickets.filter((t) => t.status === 'resolved').length}
            icon={CheckCircle}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Fechado"
            value={filteredTickets.filter((t) => t.status === 'closed').length}
            icon={XCircle}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando tickets...</p>
          </div>
        ) : viewMode === 'table' ? (
          <>
            <TicketTable
              tickets={paginatedTickets}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onDelete={handleDelete}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este ticket? Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
