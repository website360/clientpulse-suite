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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { addMonths } from "date-fns";

interface MaintenanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan?: any;
}

type ItemStatus = "done" | "not_needed" | "skipped";

export function MaintenanceFormModal({ open, onOpenChange, selectedPlan: propSelectedPlan }: MaintenanceFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!propSelectedPlan?.id) throw new Error("Plano não encontrado");

      // Calcular a próxima data de manutenção baseada no dia do mês configurado
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      // Garantir que usamos o dia correto do plano
      const nextScheduledDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), propSelectedPlan.monthly_day);

      // Criar execução
      const { data: execution, error: execError } = await supabase
        .from("maintenance_executions")
        .insert({
          maintenance_plan_id: propSelectedPlan.id,
          executed_by: user.id,
          next_scheduled_date: nextScheduledDate.toISOString().split('T')[0],
          notes,
        })
        .select()
        .single();

      if (execError) throw execError;

      // Criar itens da execução
      const executionItems = Object.entries(itemsStatus)
        .map(([itemId, status]) => ({
          maintenance_execution_id: execution.id,
          checklist_item_id: itemId,
          status,
          notes: itemsNotes[itemId] || null,
        }));

      if (executionItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("maintenance_execution_items")
          .insert(executionItems);

        if (itemsError) throw itemsError;
      }

      // Enviar WhatsApp se solicitado
      if (sendWhatsApp) {
        const { error: whatsappError } = await supabase.functions.invoke(
          "send-maintenance-whatsapp",
          {
            body: { maintenance_execution_id: execution.id },
          }
        );

        if (whatsappError) {
          console.error("Erro ao enviar WhatsApp:", whatsappError);
          toast({
            title: "Manutenção salva com avisos",
            description: "A manutenção foi salva, mas houve erro ao enviar o WhatsApp.",
            variant: "destructive",
          });
          return;
        }
      }

      return execution;
    },
    onSuccess: () => {
      toast({
        title: "Manutenção registrada",
        description: "A manutenção foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Erro ao registrar manutenção",
        description: "Ocorreu um erro ao registrar a manutenção.",
        variant: "destructive",
      });
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
                    {itemsStatus[item.id] && itemsStatus[item.id] !== "skipped" && (
                      <Textarea
                        placeholder="Observações (opcional)"
                        value={itemsNotes[item.id] || ""}
                        onChange={(e) => setItemsNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                      />
                    )}
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
                  disabled={createMaintenanceMutation.isPending || Object.keys(itemsStatus).length === 0}
                >
                  {createMaintenanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar e {sendWhatsApp ? "Enviar" : "Concluir"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
