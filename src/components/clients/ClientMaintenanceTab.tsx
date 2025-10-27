import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Globe, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseISO } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MaintenancePlanFormModal } from '@/components/maintenance/MaintenancePlanFormModal';
import { ClientMaintenanceHistory } from './ClientMaintenanceHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientMaintenanceTabProps {
  clientId: string;
}

export function ClientMaintenanceTab({ clientId }: ClientMaintenanceTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; planId: string | null }>({ open: false, planId: null });
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['client-maintenance-plans', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_maintenance_plans')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            nickname
          ),
          domains (
            id,
            domain
          ),
          maintenance_executions (
            executed_at,
            next_scheduled_date
          )
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .order('executed_at', { foreignTable: 'maintenance_executions', ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('client_maintenance_plans')
        .update({ is_active: false })
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plano removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['client-maintenance-plans', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao remover plano: ' + error.message);
    },
  });


  const handleEdit = (plan: any) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleDelete = (planId: string) => {
    setDeleteDialog({ open: true, planId });
  };

  const confirmDelete = () => {
    if (deleteDialog.planId) {
      deleteMutation.mutate(deleteDialog.planId);
      setDeleteDialog({ open: false, planId: null });
    }
  };


  if (isLoading) {
    return <div className="p-6">Carregando planos...</div>;
  }

  return (
    <Tabs defaultValue="history" className="space-y-4">
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="plans">Planos Ativos</TabsTrigger>
        </TabsList>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <TabsContent value="plans" className="space-y-4">
        {!plans || plans.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum plano de manutenção cadastrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const getStatusInfo = (plan: any) => {
                const lastExecution = plan.maintenance_executions?.[0];
                const today = new Date();
                const nextScheduledDate = getNextScheduledDate(plan);

                today.setHours(0, 0, 0, 0);
                nextScheduledDate.setHours(0, 0, 0, 0);

                if (!lastExecution) {
                  if (today > nextScheduledDate) {
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
                lastDate.setHours(0, 0, 0, 0);
                const lastMonth = lastDate.getMonth();
                const lastYear = lastDate.getFullYear();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                if (lastMonth === currentMonth && lastYear === currentYear) {
                  return {
                    variant: 'default' as const,
                    label: 'Realizada',
                    className: 'bg-success/10 text-success border-success/20'
                  };
                }

                if (today > nextScheduledDate) {
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
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const targetDay = plan.monthly_day;
                
                const lastExecution = plan.maintenance_executions?.[0];
                
                if (lastExecution) {
                  const lastDate = new Date(lastExecution.executed_at);
                  const lastMonth = lastDate.getMonth();
                  const lastYear = lastDate.getFullYear();
                  if (lastMonth === currentMonth && lastYear === currentYear) {
                    return new Date(currentYear, currentMonth + 1, targetDay);
                  }
                }
                
                if (!lastExecution && plan.start_date) {
                  const startDate = new Date(plan.start_date);
                  if (startDate > today) {
                    return startDate;
                  }
                }
                
                return new Date(currentYear, currentMonth, targetDay);
              };

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

                    <h3 className="font-semibold text-lg mb-3">
                      {plan.domains?.domain || 'Sem domínio específico'}
                    </h3>

                     <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Executada mensalmente</span>
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
                          Próxima: {format(nextDate, "MMMM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="flex-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>

                    {!plan.is_active && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Badge variant="secondary" className="text-xs">
                          Plano Inativo
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        <ClientMaintenanceHistory clientId={clientId} />
      </TabsContent>

      <MaintenancePlanFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        clientId={clientId}
        plan={selectedPlan}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este plano de manutenção? O histórico de manutenções será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
