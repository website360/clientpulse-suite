import { Globe, Calendar, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceCardsProps {
  plans: any[];
  onExecute: (plan: any) => void;
}

export function MaintenanceCards({ plans, onExecute }: MaintenanceCardsProps) {
  const getStatusInfo = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    if (!lastExecution) {
      return { 
        variant: 'destructive' as const, 
        label: 'Nunca executada',
        className: 'bg-error/10 text-error border-error/20'
      };
    }

    const lastDate = new Date(lastExecution.executed_at);
    const today = new Date();
    const daysSince = differenceInDays(today, lastDate);

    if (daysSince < 25) {
      return { 
        variant: 'default' as const, 
        label: 'Em dia',
        className: 'bg-success/10 text-success border-success/20'
      };
    }
    if (daysSince < 35) {
      return { 
        variant: 'secondary' as const, 
        label: 'Atenção',
        className: 'bg-warning/10 text-warning border-warning/20'
      };
    }
    return { 
      variant: 'destructive' as const, 
      label: 'Urgente',
      className: 'bg-error/10 text-error border-error/20'
    };
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
      <Card className="card-elevated p-12 text-center">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
        <p className="text-muted-foreground">
          Configure planos de manutenção nos cadastros de clientes
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const statusInfo = getStatusInfo(plan);
        const nextDate = getNextScheduledDate(plan);
        const lastExecution = plan.maintenance_executions?.[0];

        return (
          <Card key={plan.id} className="card-elevated hover-lift group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant={statusInfo.variant} className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                {plan.clients?.nickname || plan.clients?.company_name || plan.clients?.full_name}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-3">
                {plan.domains?.domain || 'Sem domínio específico'}
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Executado todo dia {plan.monthly_day}</span>
                </div>

                {lastExecution && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">
                      Última: {format(new Date(lastExecution.executed_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-muted-foreground">
                    Próxima: {format(nextDate, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {!plan.is_active && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Badge variant="secondary" className="text-xs">
                    Plano Inativo
                  </Badge>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-4 pt-0">
              <Button
                className="w-full gap-2"
                onClick={() => onExecute(plan)}
                disabled={!plan.is_active}
              >
                <Play className="h-4 w-4" />
                Executar Manutenção
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
