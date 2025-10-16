import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  if (!execution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
      </DialogContent>
    </Dialog>
  );
}
