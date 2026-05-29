import { Eye, Ticket as TicketIcon, Trash2, Calendar, MoreVertical, Circle, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyTickets } from '@/components/illustrations/EmptyTickets';
import { cn } from '@/lib/utils';

interface TicketTableProps {
  tickets: any[];
  onPriorityChange: (ticketId: string, newPriority: string) => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
  onDelete?: (ticketId: string) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  hideClientColumn?: boolean;
  showAssignee?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (ticketId: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
}

export function TicketTable({
  tickets,
  onPriorityChange,
  onStatusChange,
  onDelete,
  sortColumn,
  sortDirection,
  onSort,
  hideClientColumn = false,
  showAssignee = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected = false,
}: TicketTableProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const gridTemplate = [
    selectable ? '36px' : null,
    '0.7fr',                       // #
    hideClientColumn ? null : '1.6fr', // Cliente
    '2.4fr',                       // Assunto
    '1fr',                         // Depto
    '1.1fr',                       // Status
    '1fr',                         // Prioridade
    '1.1fr',                       // Resposta (SLA)
    showAssignee ? '1.2fr' : null, // Atendente
    '1.2fr',                       // Criado em
    '0.7fr',                       // Ações
  ].filter(Boolean).join(' ');

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
      open: {
        badge: 'bg-blue-50 text-blue-700 border-0 hover:bg-blue-50',
        dot: 'h-2 w-2 fill-blue-500 text-blue-500',
        label: 'Aberto',
      },
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

  const renderAssignee = (ticket: any) => {
    const name = ticket.assigned_profile?.full_name;
    if (!name) {
      return <span className="text-xs text-muted-foreground">Não atribuído</span>;
    }
    return (
      <div className="flex items-center gap-2 min-w-0">
        <AvatarInitials name={name} size="xs" />
        <span className="text-[13px] truncate">{name}</span>
      </div>
    );
  };

  const renderSLA = (ticket: any) => {
    const sla = ticket.sla_tracking;
    if (!sla) return <span className="text-xs text-muted-foreground">—</span>;
    const now = new Date();

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      if (sla.resolution_breached || sla.first_response_breached) {
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            Estourado
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="h-3 w-3" />
          SLA OK
        </Badge>
      );
    }

    if (!sla.first_response_at && sla.first_response_due_at) {
      const dueDate = new Date(sla.first_response_due_at);
      const minutesLeft = Math.floor((dueDate.getTime() - now.getTime()) / (60 * 1000));
      if (minutesLeft < 0) {
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            Atrasado
          </Badge>
        );
      }
      if (minutesLeft <= 60) {
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3" />
            {minutesLeft}min
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(dueDate, { locale: ptBR })}
        </Badge>
      );
    }

    if (!sla.resolution_at && sla.resolution_due_at) {
      const dueDate = new Date(sla.resolution_due_at);
      const hoursLeft = Math.floor((dueDate.getTime() - now.getTime()) / (60 * 60 * 1000));
      if (hoursLeft < 0) {
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            Resolução atrasada
          </Badge>
        );
      }
      if (hoursLeft <= 4) {
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3" />
            Resolver em {hoursLeft}h
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(dueDate, { locale: ptBR })}
        </Badge>
      );
    }

    return <span className="text-xs text-muted-foreground">—</span>;
  };

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={TicketIcon}
          title="Nenhum ticket encontrado"
          description="Não há tickets correspondentes aos filtros selecionados. Tente ajustar os filtros ou crie um novo ticket."
          illustration={<EmptyTickets />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="grid gap-3 px-6 py-3 bg-muted/20 rounded-xl" style={{ gridTemplateColumns: gridTemplate }}>
        {selectable && (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onToggleSelectAll?.()}
              aria-label="Selecionar todos"
            />
          </div>
        )}
        <div className="cursor-pointer" onClick={() => onSort?.('ticket_number')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest"># {sortColumn === 'ticket_number' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        {!hideClientColumn && (
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente</span>
          </div>
        )}
        <div className="cursor-pointer" onClick={() => onSort?.('subject')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Assunto {sortColumn === 'subject' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Depto</span>
        </div>
        <div className="cursor-pointer" onClick={() => onSort?.('status')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="cursor-pointer" onClick={() => onSort?.('priority')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prioridade {sortColumn === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="cursor-pointer" onClick={() => onSort?.('response_time_minutes')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resposta {sortColumn === 'response_time_minutes' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        {showAssignee && (
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atendente</span>
          </div>
        )}
        <div className="cursor-pointer" onClick={() => onSort?.('created_at')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Criado em {sortColumn === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
        </div>
      </div>

      {/* Ticket Rows as Cards */}
      {tickets.map((ticket, index) => {
        const isSelected = selectedIds?.has(ticket.id);
        return (
          <Card
            key={ticket.id}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            className={cn(
              'rounded-xl border shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer',
              isSelected ? 'border-primary/60 ring-1 ring-primary/30 bg-primary/[0.03]' : 'border-border/50'
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="grid gap-3 px-6 py-4 items-center" style={{ gridTemplateColumns: gridTemplate }}>
              {selectable && (
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect?.(ticket.id)}
                    aria-label={`Selecionar ticket ${ticket.ticket_number}`}
                  />
                </div>
              )}

              {/* # */}
              <div>
                <span className="text-[14px] font-medium text-foreground">#{ticket.ticket_number}</span>
              </div>

              {/* Cliente */}
              {!hideClientColumn && (
                <div>
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
              <div className="min-w-0">
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
                {Array.isArray(ticket.tags) && ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ticket.tags.slice(0, 4).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                    {ticket.tags.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{ticket.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Departamento */}
              <div>
                {getDeptBadge(ticket)}
              </div>

              {/* Status */}
              <div>
                {getStatusBadge(ticket.status)}
              </div>

              {/* Prioridade */}
              <div>
                {getPriorityBadge(ticket.priority)}
              </div>

              {/* SLA Tempo de Resposta */}
              <div>
                {renderSLA(ticket)}
              </div>

              {/* Atendente */}
              {showAssignee && (
                <div className="min-w-0">
                  {renderAssignee(ticket)}
                </div>
              )}

              {/* Criado em */}
              <div>
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end flex-shrink-0">
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
        );
      })}
    </div>
  );
}
