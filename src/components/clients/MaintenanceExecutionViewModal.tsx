import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, SkipForward, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaintenanceExecutionViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: any;
}

export function MaintenanceExecutionViewModal({
  open,
  onOpenChange,
  execution,
}: MaintenanceExecutionViewModalProps) {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["client-maintenance-history"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-executions"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });

  if (!execution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Manutenção</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Site</p>
              <p className="font-medium">{execution.plan?.domain?.domain || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Execução</p>
              <p className="font-medium">
                {format(parseISO(execution.executed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Executado por</p>
              <p className="font-medium">{execution.executed_by_profile?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WhatsApp</p>
              <Badge variant={execution.whatsapp_sent ? "default" : "secondary"}>
                {execution.whatsapp_sent ? "Enviado" : "Não enviado"}
              </Badge>
            </div>
          </div>

          {execution.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Observações</p>
              <p className="text-sm border rounded-lg p-3 bg-muted/50">{execution.notes}</p>
            </div>
          )}

          {execution.checklist_items && execution.checklist_items.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Checklist</p>
              <div className="space-y-2">
                {execution.checklist_items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30"
                  >
                    {item.status === 'done' && (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    )}
                    {item.status === 'not_needed' && (
                      <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    {item.status === 'skip' && (
                      <SkipForward className="h-5 w-5 text-warning flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.checklist_item?.name}</p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {item.status === 'done' && 'Realizado'}
                      {item.status === 'not_needed' && 'Não necessário'}
                      {item.status === 'skip' && 'Pular'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            onClick={() => resendWhatsAppMutation.mutate(execution.id)}
            disabled={resendWhatsAppMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {execution.whatsapp_sent ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
