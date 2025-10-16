import { Globe, Calendar, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceCardsProps {
  plans: any[];
  onExecute: (plan: any) => void;
}

export function MaintenanceCards({ plans, onExecute }: MaintenanceCardsProps) {
  const getStatusInfo = (plan: any) => {
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
        return { 
          variant: 'destructive' as const, 
          label: 'Atrasada',
          className: 'bg-error/10 text-error border-error/20'
        };
      }
      return { 
        variant: 'secondary' as const, 
        label: 'Aguardando Manutenção',
        className: 'bg-warning/10 text-warning border-warning/20'
      };
    }

    const lastDate = new Date(lastExecution.executed_at);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();

    // Se foi executada no mês/ano atual
    if (lastMonth === currentMonth && lastYear === currentYear) {
      return { 
        variant: 'default' as const, 
        label: 'Realizada',
        className: 'bg-success/10 text-success border-success/20'
      };
    }

    // Verificar se já passou do dia de execução neste mês
    const scheduledDate = new Date(currentYear, currentMonth, targetDay);
    if (today > scheduledDate) {
      return { 
        variant: 'destructive' as const, 
        label: 'Atrasada',
        className: 'bg-error/10 text-error border-error/20'
      };
    }

    return { 
      variant: 'secondary' as const, 
      label: 'Aguardando Manutenção',
      className: 'bg-warning/10 text-warning border-warning/20'
    };
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
              {shouldShowExecuteButton(plan) && (
                <Button
                  className="w-full gap-2"
                  onClick={() => onExecute(plan)}
                  disabled={!plan.is_active}
                >
                  <Play className="h-4 w-4" />
                  Executar Manutenção
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
