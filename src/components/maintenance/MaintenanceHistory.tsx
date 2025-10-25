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
import { Eye, Building2, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MaintenanceExecutionViewModal } from "@/components/clients/MaintenanceExecutionViewModal";

export function MaintenanceHistory() {
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: executions, isLoading } = useQuery({
    queryKey: ["maintenance-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_executions")
        .select(`
          *,
          plan:client_maintenance_plans(
            client:clients(full_name, nickname, company_name, client_type),
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
                        {client?.nickname || (client?.client_type === 'company' ? client?.company_name : client?.full_name) || '-'}
                      </p>
                      {client?.nickname && (
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
                  <Button variant="ghost" size="sm" onClick={() => handleView(execution)}>
                    <Eye className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
