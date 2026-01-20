import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleTicketCreated = () => {
    setShowNewTicket(false);
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      let resolvedClientId: string | null = null;

      if (contactData?.client_id) {
        resolvedClientId = contactData.client_id;
      } else {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.id) {
          resolvedClientId = clientData.id;
        }
      }

      if (!resolvedClientId) {
        throw new Error('Cliente não encontrado para este usuário');
      }

      setClientId(resolvedClientId);

      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          departments (
            id,
            name,
            color
          )
        `)
        .eq('client_id', resolvedClientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
        .eq('user_id', user?.id || '');

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

      const ticketsWithUnread = ticketsData?.map(ticket => {
        const lastMessage = lastMessageMap.get(ticket.id);
        const lastViewDate = viewsMap.get(ticket.id);
        
        const hasUnread = lastMessage && 
                         lastMessage.user_id !== user?.id && 
                         (!lastViewDate || new Date(lastMessage.created_at) > new Date(lastViewDate));
        
        return {
          ...ticket,
          hasUnread
        };
      });

      setTickets(ticketsWithUnread || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: 'Aguardando',
      in_progress: 'Em Atendimento',
      resolved: 'Resolvido',
      closed: 'Concluído',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbLabel="Meus Tickets">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel="Meus Tickets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe seus tickets de suporte
            </p>
          </div>
          <Button onClick={() => setShowNewTicket(true)} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Ticket
          </Button>
        </div>

        <Card className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      #{ticket.ticket_number}
                      {ticket.hasUnread && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-600" title="Mensagens não lidas" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: ticket.departments?.color || '#1E40AF',
                        color: ticket.departments?.color || '#1E40AF',
                      }}
                    >
                      {ticket.departments?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {clientId && (
          <NewTicketModal
            open={showNewTicket}
            onOpenChange={setShowNewTicket}
            onSuccess={handleTicketCreated}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
