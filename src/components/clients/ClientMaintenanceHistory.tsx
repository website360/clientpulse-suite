import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MaintenanceExecutionViewModal } from "./MaintenanceExecutionViewModal";

interface ClientMaintenanceHistoryProps {
  clientId: string;
}

export function ClientMaintenanceHistory({ clientId }: ClientMaintenanceHistoryProps) {
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

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

  if (isLoading) {
    return <div className="p-6">Carregando histórico...</div>;
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        Nenhuma manutenção registrada ainda
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Data Execução</TableHead>
              <TableHead>Executado por</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => (
              <TableRow key={execution.id}>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(execution)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MaintenanceExecutionViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        execution={selectedExecution}
      />
    </>
  );
}
