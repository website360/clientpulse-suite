import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TicketKanbanProps {
  tickets: any[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
}

export function TicketKanban({ tickets, onStatusChange }: TicketKanbanProps) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = [
    { id: 'open', label: 'Aberto', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { id: 'in_progress', label: 'Em Andamento', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    { id: 'waiting', label: 'Aguardando', icon: Clock, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { id: 'resolved', label: 'Resolvido', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { id: 'closed', label: 'Fechado', icon: XCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'low':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const ticketId = active.id as string;
      const newStatus = over.id as string;
      onStatusChange(ticketId, newStatus);
    }
    
    setActiveId(null);
  };

  const activeTicket = tickets.find(t => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnTickets = tickets.filter(t => t.status === column.id);
          
          return (
            <div
              key={column.id}
              data-status={column.id}
              className="flex flex-col min-h-[500px]"
            >
              <div className={`p-4 rounded-t-lg border-2 ${column.color} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <h3 className="font-semibold">{column.label}</h3>
                </div>
                <Badge variant="secondary">{columnTickets.length}</Badge>
              </div>
              
              <div
                id={column.id}
                className="flex-1 bg-muted/30 rounded-b-lg border-2 border-t-0 border-muted p-2 space-y-2 min-h-[400px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-muted/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-muted/50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-muted/50');
                  const ticketId = e.dataTransfer.getData('text/plain');
                  if (ticketId) {
                    onStatusChange(ticketId, column.id);
                  }
                }}
              >
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    id={ticket.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', ticket.id);
                      setActiveId(ticket.id);
                    }}
                    onDragEnd={() => setActiveId(null)}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className={`cursor-move hover:shadow-md transition-all ${
                      activeId === ticket.id ? 'opacity-50' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              #{ticket.ticket_number}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {ticket.departments?.name}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-sm line-clamp-2">
                            {ticket.subject}
                          </h4>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <Card className="cursor-move shadow-lg rotate-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono">#{activeTicket.ticket_number}</span>
                <Badge variant="outline" className="text-xs">
                  {activeTicket.departments?.name}
                </Badge>
              </div>
              <h4 className="font-semibold text-sm">{activeTicket.subject}</h4>
            </CardHeader>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
