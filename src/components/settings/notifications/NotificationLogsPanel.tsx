import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Search, Calendar, Filter, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toastSuccess, toastError } from '@/hooks/use-toast';
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  ticket_created: 'Ticket Criado',
  ticket_assigned: 'Ticket Atribuído',
  ticket_status_changed: 'Status Alterado',
  ticket_message: 'Nova Mensagem',
  ticket_response_admin: 'Resposta Admin',
  ticket_response_client: 'Resposta Cliente',
  ticket_response_contact: 'Resposta Contato',
  ticket_resolved: 'Ticket Resolvido',
  ticket_closed: 'Ticket Fechado',
  ticket_reopened: 'Ticket Reaberto',
  payment_due: 'Cobrança Vencendo',
  payment_overdue: 'Cobrança Vencida',
  payment_received: 'Pagamento Recebido',
  contract_expiring: 'Contrato Vencendo',
  contract_expired: 'Contrato Vencido',
  domain_expiring: 'Domínio Vencendo',
  domain_expired: 'Domínio Vencido',
  maintenance_scheduled: 'Manutenção Agendada',
  maintenance_completed: 'Manutenção Concluída',
  task_assigned: 'Tarefa Atribuída',
  task_due: 'Tarefa Vencendo',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  telegram: 'Telegram',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  telegram: 'bg-sky-500',
  sms: 'bg-green-500',
  whatsapp: 'bg-emerald-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  sent: 'bg-green-500',
  failed: 'bg-red-500',
};

export function NotificationLogsPanel() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['notification-logs', channelFilter, statusFilter, eventFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter as any);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter as any);
      }

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.recipient?.toLowerCase().includes(search) ||
      log.subject?.toLowerCase().includes(search) ||
      log.message?.toLowerCase().includes(search) ||
      EVENT_TYPE_LABELS[log.event_type]?.toLowerCase().includes(search)
    );
  });

  const clearFilters = () => {
    setChannelFilter('all');
    setStatusFilter('all');
    setEventFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = channelFilter !== 'all' || statusFilter !== 'all' || 
                          eventFilter !== 'all' || dateFrom || dateTo || searchTerm;

  const handleClearHistory = async () => {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toastSuccess('Histórico limpo', 'Todos os logs de notificação foram removidos.');
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toastError('Erro ao limpar', 'Não foi possível limpar o histórico de notificações.');
    } finally {
      setClearDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>
                Últimas 100 notificações enviadas
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setClearDialogOpen(true)}
              disabled={!logs || logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Histórico
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-3 w-3" />
              Buscar
            </Label>
            <Input
              id="search"
              placeholder="Destinatário, assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel" className="flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Canal
            </Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger id="channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Status
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom" className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Data Inicial
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo" className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Data Final
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de Logs */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando histórico...
          </div>
        ) : !filteredLogs || filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma notificação encontrada
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`${CHANNEL_COLORS[log.channel]} text-white`}
                        >
                          {CHANNEL_LABELS[log.channel] || log.channel}
                        </Badge>
                        <Badge
                          className={`${STATUS_COLORS[log.status]} text-white`}
                        >
                          {STATUS_LABELS[log.status] || log.status}
                        </Badge>
                        <Badge variant="outline">
                          {EVENT_TYPE_LABELS[log.event_type] || log.event_type}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Para:</span>{' '}
                          <span className="font-medium">{log.recipient}</span>
                        </p>
                        
                        {log.subject && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Assunto:</span>{' '}
                            <span className="font-medium">{log.subject}</span>
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {log.message}
                        </p>

                        {log.error_message && (
                          <p className="text-xs text-red-500">
                            Erro: {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {log.sent_at && format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {!log.sent_at && log.created_at && format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {filteredLogs && filteredLogs.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Mostrando {filteredLogs.length} de {logs?.length || 0} notificações
          </div>
        )}
      </CardContent>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente todos os logs de notificação. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}