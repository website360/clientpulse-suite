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

      // Preparar itens com validação robusta
      const items = Object.entries(itemsStatus)
        .filter(([itemId, status]) => {
          // Filtrar explicitamente NULL ou undefined
          if (status === null || status === undefined) {
            console.warn(`⚠️ Item ${itemId} sem status - será ignorado`);
            return false;
          }
          return true;
        })
        .map(([itemId, status]) => ({
          checklist_item_id: itemId,
          status: status as ItemStatus,
          notes: itemsNotes[itemId] || null,
        }));

      // Validação: deve ter pelo menos um item
      if (items.length === 0) {
        throw new Error('Selecione o status de pelo menos um item do checklist');
      }

      // Validação adicional: verificar se todos os status são válidos
      const validStatuses: ItemStatus[] = ['done', 'not_needed', 'skipped'];
      const invalidItems = items.filter(item => !validStatuses.includes(item.status));
      
      if (invalidItems.length > 0) {
        console.error('❌ Items com status inválido detectados:', invalidItems);
        throw new Error(`Status inválido: ${invalidItems.map(i => i.status).join(', ')}`);
      }

      // Log detalhado para debug (verificar se algum item tem status null)
      console.log('✅ Items validados sendo enviados:', {
        total: items.length,
        items: items.map(i => ({
          id: i.checklist_item_id,
          status: i.status,
          hasNotes: !!i.notes
        }))
      });
      
      // Verificação final antes do envio
      items.forEach((item, index) => {
        if (!item.status || item.status === null) {
          console.error(`❌ CRÍTICO: Item ${index} tem status NULL:`, item);
          throw new Error(`Item ${index} sem status válido`);
        }
      });

      // Chamar função RPC para criar execução
      const { data: executionId, error: rpcError } = await (supabase.rpc as any)(
        'create_maintenance_execution',
        {
          p_plan_id: propSelectedPlan.id,
          p_next_date: nextScheduledDate.toISOString().split('T')[0],
          p_notes: notes || null,
          p_items: items,
        }
      );

      if (rpcError) throw rpcError;
      if (!executionId) throw new Error("Falha ao criar execução");

      // Enviar WhatsApp se solicitado
      if (sendWhatsApp) {
        const { error: whatsappError } = await supabase.functions.invoke(
          "send-maintenance-whatsapp",
          {
            body: { maintenance_execution_id: executionId },
          }
        );

        if (whatsappError) {
          console.error("Erro ao enviar WhatsApp:", whatsappError);
          toastError("Manutenção salva com avisos", "A manutenção foi salva, mas houve erro ao enviar o WhatsApp.");
          return executionId;
        }
      }

      return executionId;
    },
    onSuccess: () => {
      toastSuccess("Manutenção registrada", "A manutenção foi registrada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Erro ao registrar manutenção:", error);
      const errorMessage = error?.message || "Ocorreu um erro ao registrar a manutenção.";
      const errorCode = error?.code ? ` (Código: ${error.code})` : "";
      toastError("Erro ao registrar manutenção", `${errorMessage}${errorCode}`);
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
