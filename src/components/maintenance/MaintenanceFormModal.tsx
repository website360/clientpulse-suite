import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { addMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MaintenanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan?: any;
}

type ItemStatus = "done" | "not_needed" | "skipped";

export function MaintenanceFormModal({ open, onOpenChange, selectedPlan: propSelectedPlan }: MaintenanceFormModalProps) {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [notes, setNotes] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [itemsStatus, setItemsStatus] = useState<Record<string, ItemStatus>>({});
  const [itemsNotes, setItemsNotes] = useState<Record<string, string>>({});

  // Normalização de status: garante apenas valores válidos do enum
  const mapStatus = (status: string): ItemStatus => {
    const normalized = status.toLowerCase().trim();
    if (normalized === "done" || normalized === "completed" || normalized === "concluido") {
      return "done";
    }
    if (normalized === "not_needed") {
      return "not_needed";
    }
    if (normalized === "skipped") {
      return "skipped";
    }
    // Fallback: se inválido, usar "done"
    return "done";
  };


  const { data: checklistItems } = useQuery({
    queryKey: ["checklist-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_checklist_items")
        .select("*")
        .eq("is_active", true)
        .order("order");

      if (error) throw error;
      return data;
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async () => {
      if (!propSelectedPlan?.id) throw new Error("Plano não encontrado");

      // Calcular a próxima data de manutenção baseada no dia do mês configurado
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      const nextScheduledDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), propSelectedPlan.monthly_day);

      // Preparar itens do checklist com normalização de status
      const items = Object.entries(itemsStatus).map(([itemId, status]) => ({
        checklist_item_id: itemId,
        status: mapStatus(status), // Normaliza para evitar erro 22P02
        notes: itemsNotes[itemId] || null,
      }));

      // Validação: deve ter pelo menos um item
      if (items.length === 0) {
        throw new Error('Selecione o status de pelo menos um item do checklist');
      }

      console.log("📤 Enviando items para RPC:", items); // Debug em DEV

      // Chamar RPC (tipagem flexível) - passa o valor do checkbox de WhatsApp
      const { data: executionId, error: rpcError } = await (supabase as any).rpc(
        'create_maintenance_execution' as any,
        {
          p_plan_id: propSelectedPlan.id,
          p_next_date: nextScheduledDate.toISOString().split('T')[0],
          p_notes: notes || null,
          p_items: items,
          p_send_whatsapp: sendWhatsApp,
        }
      );

      if (rpcError) throw rpcError;

      // O WhatsApp é enviado automaticamente pelo trigger trigger_maintenance_completed
      // via sistema de notificações quando o usuário marca a opção

      return executionId;
    },
    onSuccess: () => {
      toastSuccess("Manutenção registrada", "A manutenção foi registrada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      
      // Refetch após 3s para pegar status atualizado do WhatsApp (edge function leva ~2-3s)
      if (sendWhatsApp) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
        }, 3000);
      }
      
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Erro ao registrar manutenção:", error);
      
      // Mensagem específica para erro de enum
      const isEnumError = error?.code === "22P02" || error?.message?.includes("maintenance_item_status");
      const description = isEnumError 
        ? "Houve um valor de status inválido. Tente novamente."
        : error?.message || "Ocorreu um erro ao registrar a manutenção.";
      
      toastError("Erro ao registrar manutenção", description);
    },
  });

  const resetForm = () => {
    setNotes("");
    setSendWhatsApp(true);
    setItemsStatus({});
    setItemsNotes({});
  };

  const handleItemStatusChange = (itemId: string, status: ItemStatus) => {
    setItemsStatus(prev => ({ ...prev, [itemId]: status }));
  };

  const getStatusIcon = (status: ItemStatus) => {
    if (status === "done") return "✅";
    if (status === "not_needed") return "☑️";
    return "⏭️";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {userRole !== 'admin' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Apenas administradores podem registrar manutenções. Papel atual: {userRole || 'não definido'}
              </AlertDescription>
            </Alert>
          )}

          {propSelectedPlan && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                {propSelectedPlan.clients?.nickname || propSelectedPlan.clients?.company_name || propSelectedPlan.clients?.full_name}
              </div>
              {propSelectedPlan.domains?.domain && (
                <div className="text-sm text-muted-foreground">
                  {propSelectedPlan.domains.domain}
                </div>
              )}
            </div>
          )}

          {propSelectedPlan && (
            <>
              <div className="space-y-4">
                <Label>Checklist de Manutenção</Label>
                {checklistItems?.map((item) => (
                  <div key={item.id} className="space-y-2 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={itemsStatus[item.id] === "done" ? "default" : "outline"}
                          onClick={() => handleItemStatusChange(item.id, "done")}
                        >
                          ✅ Realizado
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={itemsStatus[item.id] === "not_needed" ? "default" : "outline"}
                          onClick={() => handleItemStatusChange(item.id, "not_needed")}
                        >
                          ☑️ Não necessário
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={itemsStatus[item.id] === "skipped" ? "default" : "outline"}
                          onClick={() => handleItemStatusChange(item.id, "skipped")}
                        >
                          ⏭️ Pular
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Observações Gerais</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre a manutenção (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-whatsapp"
                  checked={sendWhatsApp}
                  onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
                />
                <Label htmlFor="send-whatsapp" className="cursor-pointer">
                  Enviar mensagem no WhatsApp para o cliente
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMaintenanceMutation.mutate()}
                  disabled={
                    createMaintenanceMutation.isPending || 
                    Object.keys(itemsStatus).length === 0 ||
                    userRole !== 'admin'
                  }
                >
                  {createMaintenanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Manutenção
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
