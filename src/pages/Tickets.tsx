import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Clock, PlayCircle, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TicketTable } from '@/components/tickets/TicketTable';
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
import { toastSuccess, toastError } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TableSkeleton } from '@/components/loading/TableSkeleton';

export default function Tickets() {
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
    priority: 'all',
    department: 'all',
    status: 'all',
  });
  const { userRole } = useAuth();
  const navigate = useNavigate();

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
          clients (full_name, company_name, email, responsible_name, client_type),
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
      toastError('Erro ao carregar tickets', 'Não foi possível carregar a lista de tickets.');
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

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === filters.priority);
    }

    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter((ticket) => ticket.department_id === filters.department);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === filters.status);
    }

    setFilteredTickets(filtered);
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

      toastSuccess('Prioridade atualizada', 'Prioridade do ticket atualizada com sucesso.');
      fetchTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toastError('Erro ao atualizar prioridade', 'Não foi possível atualizar a prioridade do ticket.');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const validStatuses = ['waiting', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(newStatus)) return;

      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus as any })
        .eq('id', ticketId);

      if (error) throw error;

      // Notificar cliente quando status mudar para resolvido ou concluído
      if (newStatus === 'resolved' || newStatus === 'closed') {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket?.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id')
            .eq('id', ticket.client_id)
            .single();

          if (clientData?.user_id) {
            await supabase.from('notifications').insert({
              user_id: clientData.user_id,
              title: `Ticket #${ticket.ticket_number} ${newStatus === 'resolved' ? 'resolvido' : 'concluído'}`,
              description: `Seu ticket foi ${newStatus === 'resolved' ? 'resolvido' : 'concluído'}: ${ticket.subject}`,
              type: 'success',
              reference_type: 'ticket',
              reference_id: ticketId,
            });
          }
        }
      }

      toastSuccess('Status atualizado', 'Status do ticket atualizado com sucesso.');
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toastError('Erro ao atualizar status', 'Não foi possível atualizar o status do ticket.');
    }
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

      // Envio antigo de WhatsApp removido (agora centralizado em send-notification via triggers)
      // supabase.functions.invoke('send-whatsapp', {
      //   body: {
      //     action: 'send_ticket_notification',
      //     ticket_id: ticketToDelete,
      //     event_type: 'ticket_deleted',
      //   },
      // }).catch(err => console.error('Error sending WhatsApp:', err));

      // Depois, excluir o ticket
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketToDelete);

      if (error) throw error;

      toastSuccess('Ticket excluído', 'Ticket excluído com sucesso.');
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toastError('Erro ao excluir ticket', 'Não foi possível excluir o ticket.');
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
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => navigate('/ticket-metrics')} 
                size="lg" 
                variant="outline" 
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Métricas
              </Button>
              <Button onClick={() => setNewTicketModalOpen(true)} size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Ticket
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <TicketFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Aguardando"
            value={filteredTickets.filter(t => t.status === 'waiting').length}
            icon={Clock}
            variant="default"
            className="border-amber-200/50 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-amber-50 [&_.icon-wrapper]:to-amber-100/50 dark:[&_.icon-wrapper]:from-amber-950/50 dark:[&_.icon-wrapper]:to-amber-900/30 [&_.icon-wrapper_.lucide]:text-amber-600 dark:[&_.icon-wrapper_.lucide]:text-amber-400"
          />
          <MetricCard
            title="Em Atendimento"
            value={filteredTickets.filter(t => t.status === 'in_progress').length}
            icon={PlayCircle}
            variant="default"
            className="border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-blue-50 [&_.icon-wrapper]:to-blue-100/50 dark:[&_.icon-wrapper]:from-blue-950/50 dark:[&_.icon-wrapper]:to-blue-900/30 [&_.icon-wrapper_.lucide]:text-blue-600 dark:[&_.icon-wrapper_.lucide]:text-blue-400"
          />
          <MetricCard
            title="Resolvido"
            value={filteredTickets.filter(t => t.status === 'resolved').length}
            icon={CheckCircle2}
            variant="default"
            className="border-green-200/50 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-green-50 [&_.icon-wrapper]:to-green-100/50 dark:[&_.icon-wrapper]:from-green-950/50 dark:[&_.icon-wrapper]:to-green-900/30 [&_.icon-wrapper_.lucide]:text-green-600 dark:[&_.icon-wrapper_.lucide]:text-green-400"
          />
          <MetricCard
            title="Concluído"
            value={filteredTickets.filter(t => t.status === 'closed').length}
            icon={XCircle}
            variant="default"
            className="border-gray-200/50 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-card [&_.icon-wrapper]:bg-gradient-to-br [&_.icon-wrapper]:from-gray-50 [&_.icon-wrapper]:to-gray-100/50 dark:[&_.icon-wrapper]:from-gray-950/50 dark:[&_.icon-wrapper]:to-gray-900/30 [&_.icon-wrapper_.lucide]:text-gray-600 dark:[&_.icon-wrapper_.lucide]:text-gray-400"
          />
        </div>

        {/* Content */}
        {loading ? (
          <TableSkeleton rows={10} columns={8} />
        ) : (
          <>
            <TicketTable
              tickets={paginatedTickets}
              onPriorityChange={handlePriorityChange}
              onStatusChange={handleStatusChange}
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
