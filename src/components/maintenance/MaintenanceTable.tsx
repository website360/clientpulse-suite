import { Play } from 'lucide-react';
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
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceTableProps {
  plans: any[];
  onExecute: (plan: any) => void;
}

export function MaintenanceTable({ plans, onExecute }: MaintenanceTableProps) {
  const getStatusBadge = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const targetDay = plan.monthly_day;

    // Se nunca foi executada
    if (!lastExecution) {
      // Verificar se já passou do dia de execução neste mês
      const scheduledDate = new Date(currentYear, currentMonth, targetDay);
      if (today > scheduledDate) {
        return <Badge variant="destructive">Atrasada</Badge>;
      }
      return <Badge className="bg-warning/10 text-warning border-warning/20">Aguardando Manutenção</Badge>;
    }

    const lastDate = new Date(lastExecution.executed_at);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();

    // Se foi executada no mês/ano atual
    if (lastMonth === currentMonth && lastYear === currentYear) {
      return <Badge className="bg-success/10 text-success border-success/20">Realizada</Badge>;
    }

    // Verificar se já passou do dia de execução neste mês
    const scheduledDate = new Date(currentYear, currentMonth, targetDay);
    if (today > scheduledDate) {
      return <Badge variant="destructive">Atrasada</Badge>;
    }

    return <Badge className="bg-warning/10 text-warning border-warning/20">Aguardando Manutenção</Badge>;
  };

  const getNextScheduledDate = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    
    // Se já foi executada, usar next_scheduled_date
    if (lastExecution?.next_scheduled_date) {
      return parseISO(lastExecution.next_scheduled_date);
    }

    // Se nunca foi executada, próxima é neste mês no dia configurado
    const today = new Date();
    const targetDay = plan.monthly_day;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Sempre retornar o dia do mês atual se nunca foi executada
    return new Date(currentYear, currentMonth, targetDay);
  };

  const shouldShowExecuteButton = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Se já foi executada
    if (lastExecution) {
      const lastDate = new Date(lastExecution.executed_at);
      const lastMonth = lastDate.getMonth();
      const lastYear = lastDate.getFullYear();
      
      // Se foi executada no mês/ano atual, não mostrar botão
      if (lastMonth === currentMonth && lastYear === currentYear) {
        return false;
      }
    }

    // Mostrar botão se estamos no mês vigente
    return true;
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">Nenhum plano encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Domínio</TableHead>
            <TableHead>Dia Execução</TableHead>
            <TableHead>Última Manutenção</TableHead>
            <TableHead>Próxima Manutenção</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const lastExecution = plan.maintenance_executions?.[0];
            const nextDate = getNextScheduledDate(plan);

            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {plan.clients?.nickname || plan.clients?.company_name || plan.clients?.full_name}
                    </p>
                    {plan.clients?.nickname && (
                      <p className="text-xs text-muted-foreground">
                        {plan.clients?.company_name || plan.clients?.full_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {plan.domains?.domain || '-'}
                </TableCell>
                <TableCell>
                  Dia {plan.monthly_day}
                </TableCell>
                <TableCell>
                  {lastExecution 
                    ? format(new Date(lastExecution.executed_at), "dd/MM/yyyy", { locale: ptBR })
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  {format(nextDate, "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {getStatusBadge(plan)}
                </TableCell>
                <TableCell className="text-right">
                  {shouldShowExecuteButton(plan) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExecute(plan)}
                      disabled={!plan.is_active}
                      className="gap-2"
                    >
                      <Play className="h-3 w-3" />
                      Executar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
