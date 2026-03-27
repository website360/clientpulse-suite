import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Globe, Edit, Trash2, CheckCircle2, AlertCircle, MoreVertical, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
          <div className="rounded-xl border bg-card p-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-semibold mb-1">Nenhum plano de manutenção</p>
            <p className="text-[13px] text-muted-foreground">Cadastre o primeiro plano para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Domínio</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Frequência</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Última</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Próxima</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span>
              </div>
              <div className="col-span-1 text-right">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
              </div>
            </div>

            {/* Plan Rows as Cards */}
            {plans.map((plan, index) => {
              const getStatusInfo = (plan: any) => {
                const lastExecution = plan.maintenance_executions?.[0];
                const today = new Date();
                const nextScheduledDate = getNextScheduledDate(plan);

                today.setHours(0, 0, 0, 0);
                nextScheduledDate.setHours(0, 0, 0, 0);

                if (!lastExecution) {
                  if (today > nextScheduledDate) {
                    return { label: 'Atrasada', badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50', dot: 'h-2 w-2 fill-red-500 text-red-500' };
                  }
                  return { label: 'Aguardando', badge: 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50', dot: 'h-2 w-2 fill-amber-500 text-amber-500' };
                }

                const lastDate = new Date(lastExecution.executed_at);
                lastDate.setHours(0, 0, 0, 0);
                const lastMonth = lastDate.getMonth();
                const lastYear = lastDate.getFullYear();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                if (lastMonth === currentMonth && lastYear === currentYear) {
                  return { label: 'Realizada', badge: 'bg-green-50 text-green-700 border-0 hover:bg-green-50', dot: 'h-2 w-2 fill-green-500 text-green-500' };
                }

                if (today > nextScheduledDate) {
                  return { label: 'Atrasada', badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50', dot: 'h-2 w-2 fill-red-500 text-red-500' };
                }

                return { label: 'Aguardando', badge: 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50', dot: 'h-2 w-2 fill-amber-500 text-amber-500' };
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
                <Card
                  key={plan.id}
                  className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                    {/* Domínio */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-[14px] font-medium text-foreground truncate">
                          {plan.domains?.domain || 'Sem domínio'}
                        </p>
                      </div>
                    </div>

                    {/* Frequência */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>Mensal (dia {plan.monthly_day})</span>
                      </div>
                    </div>

                    {/* Última */}
                    <div className="col-span-2">
                      <p className="text-[14px] text-foreground">
                        {lastExecution
                          ? format(new Date(lastExecution.executed_at), "dd/MM/yyyy", { locale: ptBR })
                          : <span className="text-muted-foreground">—</span>}
                      </p>
                    </div>

                    {/* Próxima */}
                    <div className="col-span-2">
                      <p className="text-[14px] text-foreground">
                        {format(nextDate, "MMMM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge variant="default" className={`${statusInfo.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
                        <Circle className={statusInfo.dot} />
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Ações */}
                    <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                          <DropdownMenuItem onClick={() => handleEdit(plan)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(plan.id)}
                            className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
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
