import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Globe, Edit, Trash2, PowerOff, Power } from 'lucide-react';
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
          <MaintenanceCards plans={plans} onExecute={handleExecute} />
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
