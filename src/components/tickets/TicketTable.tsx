import { Eye, Ticket as TicketIcon, Trash2, Calendar, Building2, User } from 'lucide-react';
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
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TicketTableProps {
  tickets: any[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onPriorityChange: (ticketId: string, newPriority: string) => void;
  onDelete?: (ticketId: string) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function TicketTable({ tickets, onStatusChange, onPriorityChange, onDelete, sortColumn, sortDirection, onSort }: TicketTableProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'badge-priority-urgent';
      case 'high':
        return 'badge-priority-high';
      case 'medium':
        return 'badge-priority-medium';
      case 'low':
        return 'badge-priority-low';
      default:
        return 'badge-priority-medium';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-status-open';
      case 'in_progress':
        return 'badge-status-in-progress';
      case 'waiting':
        return 'badge-status-waiting';
      case 'resolved':
        return 'badge-status-resolved';
      case 'closed':
        return 'badge-status-closed';
      default:
        return 'badge-status-open';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      waiting: 'Aguardando',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  if (tickets.length === 0) {
    return (
      <Card className="card-elevated p-12 text-center">
        <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
        <p className="text-muted-foreground">
          Não há tickets correspondentes aos filtros selecionados
        </p>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead column="ticket_number" label="#" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} className="w-[100px]" />
            <SortableTableHead column="subject" label="Assunto" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} className="w-[250px]" />
            <TableHead>Cliente</TableHead>
            <TableHead>Departamento</TableHead>
            <SortableTableHead column="priority" label="Prioridade" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
            <SortableTableHead column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
            <SortableTableHead column="created_at" label="Criado em" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} className="hover:bg-accent/50">
              <TableCell className="font-medium">#{ticket.ticket_number}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1" title={ticket.subject}>{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1" title={ticket.description}>
                      {ticket.description}
                    </p>
                  </div>
                  {ticket.hasUnread && (
                    <div className="flex-shrink-0">
                      <span className="flex h-2 w-2 rounded-full bg-blue-600" title="Mensagens não lidas" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {ticket.clients?.client_type === 'company' ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {ticket.clients?.nickname || ticket.clients?.company_name || ticket.clients?.full_name || '-'}
                    </p>
                    {ticket.clients?.nickname && (
                      <p className="text-xs text-muted-foreground">
                        {ticket.clients?.company_name || ticket.clients?.full_name}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: ticket.departments?.color || '#1E40AF',
                    color: ticket.departments?.color || '#1E40AF'
                  }}
                >
                  {ticket.departments?.name || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={getPriorityColor(ticket.priority)}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </TableCell>
              <TableCell>
                <span className={getStatusColor(ticket.status)}>
                  {getStatusLabel(ticket.status)}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {userRole === 'admin' && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(ticket.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
