import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Globe, Edit, Trash2, PowerOff, Power, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseISO } from 'date-fns';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MaintenancePlanFormModal } from '@/components/maintenance/MaintenancePlanFormModal';
import { MaintenanceFormModal } from '@/components/maintenance/MaintenanceFormModal';
import { MaintenanceCards } from '@/components/maintenance/MaintenanceCards';
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
  const [isFormOpen, setIsFormOpen] = useState(false); // Plan form
  const [isExecuteOpen, setIsExecuteOpen] = useState(false); // Execute maintenance modal
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
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plano excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['client-maintenance-plans', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir plano: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('client_maintenance_plans')
        .update({ is_active: !isActive })
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status do plano atualizado');
      queryClient.invalidateQueries({ queryKey: ['client-maintenance-plans', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar plano: ' + error.message);
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

  const handleExecute = (plan: any) => {
    setSelectedPlan(plan);
    setIsExecuteOpen(true);
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

  const getStatusColor = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    if (!lastExecution) return 'destructive';

    const lastDate = new Date(lastExecution.executed_at);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince < 25) return 'default';
    if (daysSince < 35) return 'secondary';
    return 'destructive';
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
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const targetDay = plan.monthly_day;

                if (!lastExecution) {
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

                if (lastMonth === currentMonth && lastYear === currentYear) {
                  return { 
                    variant: 'default' as const, 
                    label: 'Realizada',
                    className: 'bg-success/10 text-success border-success/20'
                  };
                }

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
                if (lastExecution?.next_scheduled_date) {
                  return parseISO(lastExecution.next_scheduled_date);
                }
                const today = new Date();
                return new Date(today.getFullYear(), today.getMonth(), plan.monthly_day);
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

      <MaintenanceFormModal
        open={isExecuteOpen}
        onOpenChange={setIsExecuteOpen}
        selectedPlan={selectedPlan}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano de manutenção? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
