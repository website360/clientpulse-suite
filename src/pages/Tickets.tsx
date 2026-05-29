import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TrendingUp, Link2, UserCog, Trash2, X, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { TablePagination } from '@/components/ui/table-pagination';
import { useClientPagination } from '@/hooks/useClientPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toastSuccess, toastError, toastInfo } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TableSkeleton } from '@/components/loading/TableSkeleton';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  full_name: string;
}

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'in_progress', label: 'Em Atendimento' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Concluído' },
];

export default function Tickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    department: 'all',
    status: 'all',
    assignee: 'all',
  });
  const { userRole } = useAuth();
  const navigate = useNavigate();

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
    fetchAgents();
  }, []);

  useEffect(() => {
    applyFilters();
    setSelectedIds(new Set());
  }, [tickets, filters]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles(id, full_name)')
        .eq('role', 'admin');
      if (error) throw error;
      const list = (data || [])
        .map((row: any) => (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles))
        .filter((p: any) => p && p.id)
        .map((p: any) => ({ id: p.id, full_name: p.full_name || 'Atendente' }));
      setAgents(list);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients (full_name, company_name, email, responsible_name, client_type),
          departments (name, color),
          assigned_profile:profiles!tickets_assigned_to_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
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

        const lastMessageMap = new Map();
        lastMessages?.forEach(msg => {
          if (!lastMessageMap.has(msg.ticket_id)) {
            lastMessageMap.set(msg.ticket_id, { created_at: msg.created_at, user_id: msg.user_id });
          }
        });

        const viewsMap = new Map();
        ticketViews?.forEach(view => {
          viewsMap.set(view.ticket_id, view.last_viewed_at);
        });

        const { data: slaData } = await supabase
          .from('ticket_sla_tracking')
          .select('ticket_id, first_response_due_at, first_response_at, first_response_breached, resolution_due_at, resolution_at, resolution_breached')
          .in('ticket_id', ticketIds);

        const slaMap = new Map();
        slaData?.forEach(sla => {
          slaMap.set(sla.ticket_id, sla);
        });

        const ticketsWithUnread = ticketsData?.map(ticket => {
          const lastMessage = lastMessageMap.get(ticket.id);
          const lastViewDate = viewsMap.get(ticket.id);
          const hasUnread = lastMessage &&
            lastMessage.user_id !== user.id &&
            (!lastViewDate || new Date(lastMessage.created_at) > new Date(lastViewDate));
          return {
            ...ticket,
            hasUnread,
            sla_tracking: slaMap.get(ticket.id) || null,
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

  // Filtra tudo exceto status (para calcular as contagens das abas)
  const baseFiltered = useMemo(() => {
    let filtered = [...tickets];

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
    if (filters.priority !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === filters.priority);
    }
    if (filters.department !== 'all') {
      filtered = filtered.filter((ticket) => ticket.department_id === filters.department);
    }
    if (filters.assignee && filters.assignee !== 'all') {
      filtered = filters.assignee === 'unassigned'
        ? filtered.filter((ticket) => !ticket.assigned_to)
        : filtered.filter((ticket) => ticket.assigned_to === filters.assignee);
    }
    return filtered;
  }, [tickets, filters.search, filters.priority, filters.department, filters.assignee]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseFiltered.length };
    for (const tab of STATUS_TABS) {
      if (tab.value === 'all') continue;
      counts[tab.value] = baseFiltered.filter((t) => t.status === tab.value).length;
    }
    return counts;
  }, [baseFiltered]);

  const applyFilters = () => {
    let filtered = [...baseFiltered];
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
      await supabase.from('tasks').update({ ticket_id: null }).eq('ticket_id', ticketToDelete);
      const { error } = await supabase.from('tickets').delete().eq('id', ticketToDelete);
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

  // ---- Seleção e ações em massa ----
  const selectedArray = Array.from(selectedIds);
  const allPageSelected = paginatedTickets.length > 0 && paginatedTickets.every((t) => selectedIds.has(t.id));

  const toggleSelect = (ticketId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedTickets.forEach((t) => next.delete(t.id));
      } else {
        paginatedTickets.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkAssign = async (value: string) => {
    if (selectedArray.length === 0) return;
    const newAssignee = value === 'unassigned' ? null : value;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: newAssignee })
        .in('id', selectedArray);
      if (error) throw error;
      toastSuccess('Atendente atualizado', `${selectedArray.length} ticket(s) atualizados.`);
      clearSelection();
      fetchTickets();
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toastError('Erro ao atribuir', 'Não foi possível atribuir os tickets.');
    }
  };

  const bulkStatus = async (value: string) => {
    if (selectedArray.length === 0) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: value as any })
        .in('id', selectedArray);
      if (error) throw error;
      toastSuccess('Status atualizado', `${selectedArray.length} ticket(s) atualizados.`);
      clearSelection();
      fetchTickets();
    } catch (error) {
      console.error('Error bulk status:', error);
      toastError('Erro ao atualizar status', 'Não foi possível atualizar os tickets.');
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedArray.length === 0) return;
    try {
      await supabase.from('tasks').update({ ticket_id: null }).in('ticket_id', selectedArray);
      const { error } = await supabase.from('tickets').delete().in('id', selectedArray);
      if (error) throw error;
      toastSuccess('Tickets excluídos', `${selectedArray.length} ticket(s) excluídos.`);
      clearSelection();
      fetchTickets();
    } catch (error) {
      console.error('Error bulk delete:', error);
      toastError('Erro ao excluir', 'Não foi possível excluir os tickets.');
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Tickets</h1>
            <p className="text-[15px] text-muted-foreground">
              Gerencie todos os tickets de suporte
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  const link = `${window.location.origin}/abrir-chamado`;
                  navigator.clipboard.writeText(link);
                  toastInfo('Link copiado!', 'O link do formulário público foi copiado para a área de transferência.');
                }}
                size="lg"
                variant="outline"
                className="gap-2 h-11"
              >
                <Link2 className="h-4 w-4" />
                Copiar Link Externo
              </Button>
              <Button
                onClick={() => navigate('/ticket-metrics')}
                size="lg"
                variant="outline"
                className="gap-2 h-11"
              >
                <TrendingUp className="h-4 w-4" />
                Métricas
              </Button>
              <Button onClick={() => setNewTicketModalOpen(true)} size="lg" className="h-11 shadow-md hover:shadow-lg bg-[#141924] hover:bg-[#1a2030] text-white">
                Novo Ticket
              </Button>
            </div>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-px">
          {STATUS_TABS.map((tab) => {
            const active = filters.status === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilters({ ...filters, status: tab.value })}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold',
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {statusCounts[tab.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <TicketFilters filters={filters} onFiltersChange={setFilters} agents={agents} showAssignee={isAdmin} />
        </div>

        {/* Bulk action bar */}
        {isAdmin && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-primary" />
              {selectedIds.size} selecionado(s)
            </div>
            <div className="h-5 w-px bg-border" />

            <Select onValueChange={bulkAssign}>
              <SelectTrigger className="h-9 w-[190px]">
                <UserCog className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Atribuir a..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={bulkStatus}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Mudar status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>

            <Button variant="ghost" size="sm" className="h-9 gap-1.5 ml-auto" onClick={clearSelection}>
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        )}

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
              showAssignee={isAdmin}
              selectable={isAdmin}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allPageSelected}
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

        <NewTicketModal
          open={newTicketModalOpen}
          onOpenChange={setNewTicketModalOpen}
          onSuccess={() => {
            fetchTickets();
            setNewTicketModalOpen(false);
          }}
        />

        {/* Single delete */}
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

        {/* Bulk delete */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedIds.size} ticket(s)</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir os tickets selecionados? Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
