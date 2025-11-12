import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { 
  CheckSquare, 
  Ticket, 
  FileText, 
  DollarSign, 
  Globe,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface DailyPendenciesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendencyData {
  tasks: any[];
  tickets: any[];
  contracts: any[];
  receivables: any[];
  payables: any[];
  domains: any[];
}

export function DailyPendenciesModal({ open, onOpenChange }: DailyPendenciesModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendencyData>({
    tasks: [],
    tickets: [],
    contracts: [],
    receivables: [],
    payables: [],
    domains: [],
  });

  useEffect(() => {
    if (open && user) {
      fetchPendencies();
    }
  }, [open, user]);

  const fetchPendencies = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      // Tarefas pendentes
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)')
        .in('status', ['todo', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('due_date', { ascending: true })
        .limit(10);

      // Tickets pendentes
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*, client:clients(company_name, full_name)')
        .in('status', ['waiting', 'in_progress'])
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      // Contratos próximos ao vencimento (próximos 30 dias)
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*, client:clients(company_name, full_name), service:services(name)')
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .lte('end_date', format(addDays(today, 30), 'yyyy-MM-dd'))
        .order('end_date', { ascending: true });

      // Contas a receber próximas ao vencimento (próximos 7 dias)
      const { data: receivables } = await supabase
        .from('accounts_receivable')
        .select('*, client:clients(company_name, full_name)')
        .eq('status', 'pending')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(nextWeek, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(10);

      // Contas a pagar próximas ao vencimento (próximos 7 dias)
      const { data: payables } = await supabase
        .from('accounts_payable')
        .select('*, supplier:suppliers(name)')
        .eq('status', 'pending')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(nextWeek, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(10);

      // Domínios próximos ao vencimento (próximos 30 dias)
      const { data: domains } = await supabase
        .from('domains')
        .select('*, client:clients(company_name, full_name)')
        .not('expire_date', 'is', null)
        .gte('expire_date', format(today, 'yyyy-MM-dd'))
        .lte('expire_date', format(addDays(today, 30), 'yyyy-MM-dd'))
        .order('expire_date', { ascending: true });

      setData({
        tasks: tasks || [],
        tickets: tickets || [],
        contracts: contracts || [],
        receivables: receivables || [],
        payables: payables || [],
        domains: domains || [],
      });
    } catch (error) {
      console.error('Error fetching pendencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (date: string) => {
    const dueDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'destructive';
    if (diffDays <= 3) return 'default';
    return 'secondary';
  };

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6" />
            Resumo de Pendências
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Tarefas */}
            {data.tasks.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Tarefas Pendentes</h3>
                    <Badge variant="secondary">{data.tasks.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/tasks')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-2">
                  {data.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate('/tasks')}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.assigned_to_profile?.full_name || 'Não atribuído'}
                        </p>
                      </div>
                      {task.due_date && (
                        <Badge variant={getUrgencyColor(task.due_date)} className="text-xs">
                          {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tickets */}
            {data.tickets.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold">Tickets Pendentes</h3>
                    <Badge variant="secondary">{data.tickets.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/tickets')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="space-y-2">
                  {data.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate(`/tickets/${ticket.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">#{ticket.ticket_number} - {ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.client?.company_name || ticket.client?.full_name}
                        </p>
                      </div>
                      <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'default'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contratos */}
            {data.contracts.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold">Contratos Próximos ao Vencimento</h3>
                    <Badge variant="secondary">{data.contracts.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/contracts')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="space-y-2">
                  {data.contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate('/contracts')}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {contract.client?.company_name || contract.client?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {contract.service?.name}
                        </p>
                      </div>
                      <Badge variant={getUrgencyColor(contract.end_date)} className="text-xs">
                        {format(new Date(contract.end_date), "dd 'de' MMM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contas a Receber */}
            {data.receivables.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Contas a Receber (Próximos 7 dias)</h3>
                    <Badge variant="secondary">{data.receivables.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/accounts-receivable')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-2">
                  {data.receivables.map((receivable) => (
                    <div
                      key={receivable.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate('/accounts-receivable')}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {receivable.client?.company_name || receivable.client?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          R$ {Number(receivable.amount).toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={getUrgencyColor(receivable.due_date)} className="text-xs">
                        {format(new Date(receivable.due_date), "dd 'de' MMM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contas a Pagar */}
            {data.payables.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold">Contas a Pagar (Próximos 7 dias)</h3>
                    <Badge variant="secondary">{data.payables.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/accounts-payable')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-2">
                  {data.payables.map((payable) => (
                    <div
                      key={payable.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate('/accounts-payable')}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{payable.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {payable.supplier?.name} - R$ {Number(payable.amount).toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={getUrgencyColor(payable.due_date)} className="text-xs">
                        {format(new Date(payable.due_date), "dd 'de' MMM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Domínios */}
            {data.domains.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Domínios Próximos ao Vencimento</h3>
                    <Badge variant="secondary">{data.domains.length}</Badge>
                  </div>
                  <button
                    onClick={() => handleNavigate('/domains')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="space-y-2">
                  {data.domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleNavigate('/domains')}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{domain.domain_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {domain.client?.company_name || domain.client?.full_name}
                        </p>
                      </div>
                      <Badge variant={getUrgencyColor(domain.expire_date)} className="text-xs">
                        {format(new Date(domain.expire_date), "dd 'de' MMM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Mensagem se não houver pendências */}
            {!loading &&
              data.tasks.length === 0 &&
              data.tickets.length === 0 &&
              data.contracts.length === 0 &&
              data.receivables.length === 0 &&
              data.payables.length === 0 &&
              data.domains.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CheckSquare className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">Nenhuma pendência encontrada!</p>
                    <p className="text-sm text-muted-foreground">
                      Você está em dia com todas as suas tarefas 🎉
                    </p>
                  </div>
                </Card>
              )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
