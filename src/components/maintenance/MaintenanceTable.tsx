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
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceTableProps {
  plans: any[];
  onExecute: (plan: any) => void;
}

export function MaintenanceTable({ plans, onExecute }: MaintenanceTableProps) {
  const getStatusBadge = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    if (!lastExecution) {
      return <Badge variant="destructive">Nunca executada</Badge>;
    }

    const lastDate = new Date(lastExecution.executed_at);
    const today = new Date();
    const daysSince = differenceInDays(today, lastDate);

    if (daysSince < 25) {
      return <Badge className="bg-success/10 text-success border-success/20">Em dia</Badge>;
    }
    if (daysSince < 35) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Atenção</Badge>;
    }
    return <Badge variant="destructive">Urgente</Badge>;
  };

  const getNextScheduledDate = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    if (lastExecution?.next_scheduled_date) {
      return new Date(lastExecution.next_scheduled_date);
    }

    const today = new Date();
    const targetDay = plan.monthly_day;
    const currentDay = today.getDate();

    if (currentDay <= targetDay) {
      return new Date(today.getFullYear(), today.getMonth(), targetDay);
    } else {
      return new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
    }
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
                <TableCell className="font-medium">
                  {plan.clients?.nickname || plan.clients?.company_name || plan.clients?.full_name}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
