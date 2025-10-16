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

export function MaintenanceHistory() {
    const { data: executions, isLoading } = useQuery({
    queryKey: ["maintenance-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_executions")
        .select(`
          *,
          plan:client_maintenance_plans(
            client:clients(full_name, nickname, company_name),
            domain:domains(domain)
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
            const clientName = execution.plan?.client?.nickname || 
                             execution.plan?.client?.company_name || 
                             execution.plan?.client?.full_name;
            
            return (
              <TableRow key={execution.id}>
                <TableCell className="font-medium">{clientName}</TableCell>
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
                  <Button variant="ghost" size="sm">
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
    </div>
  );
}
