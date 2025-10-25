import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Building2, User, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MaintenanceExecutionViewModal } from "@/components/clients/MaintenanceExecutionViewModal";
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

export function MaintenanceHistory() {
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: executions, isLoading } = useQuery({
    queryKey: ["maintenance-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_executions")
        .select(`
          *,
          plan:client_maintenance_plans(
            client:clients(full_name, nickname, company_name, client_type, responsible_name),
            domain:domains(domain)
          ),
          checklist_items:maintenance_execution_items(
            id,
            status,
            notes,
            checklist_item:maintenance_checklist_items(id, name)
          )
        `)
        .order("executed_at", { ascending: false })
        .limit(50);

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
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      setDeleteDialogOpen(false);
      setExecutionToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir histórico: " + error.message);
    },
  });

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Data Execução</TableHead>
            <TableHead>Executado por</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Próxima</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions?.map((execution) => {
            const client = execution.plan?.client;
            
            return (
              <TableRow key={execution.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {client?.client_type === 'company' ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {client?.responsible_name || (client?.client_type === 'company' ? client?.company_name : client?.full_name) || '-'}
                      </p>
                      {client?.responsible_name && (
                        <p className="text-xs text-muted-foreground">
                          {client?.client_type === 'company' 
                            ? client?.company_name 
                            : client?.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{execution.plan?.domain?.domain || "-"}</TableCell>
                <TableCell>
                  {format(parseISO(execution.executed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>{execution.executed_by_profile?.full_name}</TableCell>
                <TableCell>
                  <Badge variant={execution.whatsapp_sent ? "default" : "secondary"}>
                    {execution.whatsapp_sent ? "Enviado" : "Não enviado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {execution.next_scheduled_date
                    ? format(parseISO(execution.next_scheduled_date), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleView(execution)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClick(execution)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {executions?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma manutenção registrada ainda
        </div>
      )}

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
    </div>
  );
}
