import { Eye, Ticket as TicketIcon, Trash2, Calendar, MoreVertical, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyTickets } from '@/components/illustrations/EmptyTickets';

interface TicketTableProps {
  tickets: any[];
  onPriorityChange: (ticketId: string, newPriority: string) => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
  onDelete?: (ticketId: string) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  hideClientColumn?: boolean;
}

export function TicketTable({ tickets, onPriorityChange, onStatusChange, onDelete, sortColumn, sortDirection, onSort, hideClientColumn = false }: TicketTableProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { badge: string; dot: string; label: string }> = {
      urgent: {
        badge: 'bg-purple-50 text-purple-700 border-0 hover:bg-purple-50',
        dot: 'h-2 w-2 fill-purple-500 text-purple-500',
        label: 'Urgente',
      },
      high: {
        badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50',
        dot: 'h-2 w-2 fill-red-500 text-red-500',
        label: 'Alta',
      },
      medium: {
        badge: 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50',
        dot: 'h-2 w-2 fill-amber-500 text-amber-500',
        label: 'Média',
      },
      low: {
        badge: 'bg-gray-100 text-gray-600 border-0 hover:bg-gray-100',
        dot: 'h-2 w-2 fill-gray-400 text-gray-400',
        label: 'Baixa',
      },
    };
    const config = styles[priority] || styles.medium;
    return (
      <Badge variant="default" className={`${config.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Circle className={config.dot} />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { badge: string; dot: string; label: string }> = {
      waiting: {
        badge: 'bg-blue-50 text-blue-700 border-0 hover:bg-blue-50',
        dot: 'h-2 w-2 fill-blue-500 text-blue-500',
        label: 'Aguardando',
      },
      in_progress: {
        badge: 'bg-purple-50 text-purple-700 border-0 hover:bg-purple-50',
        dot: 'h-2 w-2 fill-purple-500 text-purple-500',
        label: 'Em Atendimento',
      },
      resolved: {
        badge: 'bg-green-50 text-green-700 border-0 hover:bg-green-50',
        dot: 'h-2 w-2 fill-green-500 text-green-500',
        label: 'Resolvido',
      },
      closed: {
        badge: 'bg-gray-100 text-gray-600 border-0 hover:bg-gray-100',
        dot: 'h-2 w-2 fill-gray-400 text-gray-400',
        label: 'Concluído',
      },
    };
    const config = styles[status] || styles.waiting;
    return (
      <Badge variant="default" className={`${config.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Circle className={config.dot} />
        {config.label}
      </Badge>
    );
  };

  const getDeptBadge = (ticket: any) => {
    const deptName = ticket.departments?.name || 'N/A';
    const deptColor = ticket.departments?.color || '#6366F1';
    return (
      <Badge variant="default" className="font-medium px-3 py-1 flex items-center gap-1.5 w-fit border-0" style={{ backgroundColor: `${deptColor}15`, color: deptColor }}>
        <Circle className="h-2 w-2" style={{ fill: deptColor, color: deptColor }} />
        {deptName}
      </Badge>
    );
  };

  if (tickets.length === 0) {
    return (
      <Card className="card-elevated">
        <EmptyState
          icon={TicketIcon}
          title="Nenhum ticket encontrado"
          description="Não há tickets correspondentes aos filtros selecionados. Tente ajustar os filtros ou crie um novo ticket."
          illustration={<EmptyTickets />}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-3 bg-muted/20 rounded-xl`}>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort?.('ticket_number')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest"># {sortColumn === 'ticket_number' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        {!hideClientColumn && (
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente</span>
          </div>
        )}
        <div className="col-span-3 cursor-pointer" onClick={() => onSort?.('subject')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Assunto {sortColumn === 'subject' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Depto</span>
        </div>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort?.('status')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort?.('priority')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prioridade {sortColumn === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('created_at')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Criado em {sortColumn === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
        </div>
      </div>

      {/* Ticket Rows as Cards */}
      {tickets.map((ticket, index) => (
        <Card 
          key={ticket.id}
          onClick={() => navigate(`/tickets/${ticket.id}`)}
          className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-4 items-center`}>
            {/* # */}
            <div className="col-span-1">
              <span className="text-[14px] font-medium text-foreground">#{ticket.ticket_number}</span>
            </div>

            {/* Cliente */}
            {!hideClientColumn && (
              <div className="col-span-2">
                {ticket.client_id ? (
                  <ClientNameCell client={ticket.clients || {}} />
                ) : (
                  <div className="flex flex-col">
                    <span className="font-medium text-[14px]">{ticket.requester_name || 'Anônimo'}</span>
                    {ticket.requester_email && (
                      <span className="text-xs text-muted-foreground">{ticket.requester_email}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Assunto */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium line-clamp-1" title={ticket.subject}>{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1" title={ticket.description}>
                    {ticket.description}
                  </p>
                </div>
                {ticket.hasUnread && (
                  <div className="flex-shrink-0 animate-pulse-subtle">
                    <span className="flex h-2 w-2 rounded-full bg-blue-600" title="Mensagens não lidas" />
                  </div>
                )}
              </div>
            </div>

            {/* Departamento */}
            <div className="col-span-1">
              {getDeptBadge(ticket)}
            </div>

            {/* Status */}
            <div className="col-span-1">
              {getStatusBadge(ticket.status)}
            </div>

            {/* Prioridade */}
            <div className="col-span-1">
              {getPriorityBadge(ticket.priority)}
            </div>

            {/* Criado em */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </div>

            {/* Ações */}
            <div className="col-span-1 flex items-center justify-end flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tickets/${ticket.id}`);
                    }}
                    className="rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {userRole === 'admin' && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(ticket.id);
                        }}
                        className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
