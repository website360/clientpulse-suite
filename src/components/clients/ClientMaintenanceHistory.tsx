import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Trash2, Send, MoreVertical, Circle, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientNameCell } from "@/components/shared/ClientNameCell";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MaintenanceExecutionViewModal } from "./MaintenanceExecutionViewModal";
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
import { toast } from "sonner";

interface ClientMaintenanceHistoryProps {
  clientId: string;
}

export function ClientMaintenanceHistory({ clientId }: ClientMaintenanceHistoryProps) {
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: executions, isLoading } = useQuery({
    queryKey: ["client-maintenance-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_executions")
        .select(`
          *,
          plan:client_maintenance_plans!inner(
            id,
            client_id,
            domain:domains(domain)
          ),
          checklist_items:maintenance_execution_items(
            id,
            status,
            notes,
            checklist_item:maintenance_checklist_items(
              id,
              name
            )
          )
        `)
        .eq("plan.client_id", clientId)
        .order("executed_at", { ascending: false });

      if (error) throw error;

      // Buscar perfis dos executores
      const userIds = [...new Set(data.map(e => e.executed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Associar perfis às execuções
      return data.map(exec => ({
        ...exec,
        executed_by_profile: profiles?.find(p => p.id === exec.executed_by)
      }));
    },
  });

  const handleView = (execution: any) => {
    setSelectedExecution(execution);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (execution: any) => {
    setExecutionToDelete(execution);
    setDeleteDialogOpen(true);
  };

  const resendWhatsAppMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("send-maintenance-whatsapp", {
        body: { maintenance_execution_id: executionId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao enviar mensagem");
    },
    onSuccess: () => {
      toast.success("Mensagem WhatsApp enviada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["client-maintenance-history", clientId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (executionId: string) => {
      // Deletar items da execução primeiro
      const { error: itemsError } = await supabase
        .from("maintenance_execution_items")
        .delete()
        .eq("maintenance_execution_id", executionId);

      if (itemsError) throw itemsError;

      // Deletar a execução
      const { error } = await supabase
        .from("maintenance_executions")
        .delete()
        .eq("id", executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Histórico de manutenção excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["client-maintenance-history", clientId] });
      setDeleteDialogOpen(false);
      setExecutionToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir histórico: " + error.message);
    },
  });

  if (isLoading) {
    return <div className="p-6">Carregando histórico...</div>;
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border bg-card">
        <p className="text-[13px] text-muted-foreground">Nenhuma manutenção registrada ainda</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
          <div className="col-span-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Site</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Execução</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Executado por</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">WhatsApp</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Próxima</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Execution Rows as Cards */}
        {executions.map((execution, index) => (
          <Card
            key={execution.id}
            className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              {/* Site */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-[14px] font-medium text-foreground truncate">
                    {execution.plan?.domain?.domain || "-"}
                  </p>
                </div>
              </div>

              {/* Data Execução */}
              <div className="col-span-2">
                <p className="text-[14px] text-foreground">
                  {format(parseISO(execution.executed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Executado por */}
              <div className="col-span-2">
                <p className="text-[14px] text-foreground">
                  {execution.executed_by_profile?.full_name || "-"}
                </p>
              </div>

              {/* WhatsApp */}
              <div className="col-span-2">
                <Badge
                  variant="default"
                  className={`font-medium px-3 py-1 flex items-center gap-1.5 w-fit ${
                    execution.whatsapp_sent
                      ? 'bg-green-50 text-green-700 border-0 hover:bg-green-50'
                      : 'bg-gray-100 text-gray-600 border-0 hover:bg-gray-100'
                  }`}
                >
                  <Circle className={execution.whatsapp_sent ? 'h-2 w-2 fill-green-500 text-green-500' : 'h-2 w-2 fill-gray-400 text-gray-400'} />
                  {execution.whatsapp_sent ? "Enviado" : "Não enviado"}
                </Badge>
              </div>

              {/* Próxima */}
              <div className="col-span-2">
                <p className="text-[14px] text-foreground">
                  {execution.next_scheduled_date
                    ? format(parseISO(execution.next_scheduled_date), "MMMM/yyyy", { locale: ptBR })
                        .replace(/^\w/, (c) => c.toUpperCase())
                    : "-"}
                </p>
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
                    <DropdownMenuItem onClick={() => handleView(execution)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => resendWhatsAppMutation.mutate(execution.id)}
                      disabled={resendWhatsAppMutation.isPending}
                      className="rounded-lg px-3 py-2.5 cursor-pointer"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {execution.whatsapp_sent ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(execution)}
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
        ))}
      </div>

      <MaintenanceExecutionViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        execution={selectedExecution}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este histórico de manutenção? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executionToDelete && deleteMutation.mutate(executionToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
