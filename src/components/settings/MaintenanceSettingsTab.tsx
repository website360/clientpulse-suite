import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, item, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded bg-background">
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <span className="flex-1">{item.name}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function MaintenanceSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: checklistItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["maintenance-checklist-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_checklist_items")
        .select("*")
        .order("order");

      if (error) throw error;
      return data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("maintenance_settings")
        .update(updates)
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
      toast({ title: "Configurações salvas com sucesso" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = Math.max(...(checklistItems?.map(i => i.order) || [0]));
      const { error } = await supabase
        .from("maintenance_checklist_items")
        .insert({ name, order: maxOrder + 1 });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-checklist-items"] });
      setNewItemName("");
      toast({ title: "Item adicionado com sucesso" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-checklist-items"] });
      toast({ title: "Item removido com sucesso" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id && checklistItems) {
      const oldIndex = checklistItems.findIndex((item) => item.id === active.id);
      const newIndex = checklistItems.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(checklistItems, oldIndex, newIndex);

      // Atualizar ordem no banco
      for (let i = 0; i < newItems.length; i++) {
        await supabase
          .from("maintenance_checklist_items")
          .update({ order: i })
          .eq("id", newItems[i].id);
      }

      queryClient.invalidateQueries({ queryKey: ["maintenance-checklist-items"] });
    }
  };

  if (settingsLoading || itemsLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Itens do Checklist</CardTitle>
          <CardDescription>
            Gerencie os itens que aparecem no checklist de manutenção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do novo item"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <Button
              onClick={() => addItemMutation.mutate(newItemName)}
              disabled={!newItemName || addItemMutation.isPending}
            >
              {addItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={checklistItems?.map(i => i.id) || []} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {checklistItems?.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    item={item}
                    onDelete={(id: string) => deleteItemMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template da Mensagem WhatsApp</CardTitle>
          <CardDescription>
            Variáveis disponíveis: {"{cliente_nome}"}, {"{site_url}"}, {"{checklist}"}, {"{assinatura}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              rows={15}
              value={settings?.whatsapp_template || ""}
              onChange={(e) => updateSettingsMutation.mutate({ whatsapp_template: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Assinatura</Label>
            <Input
              value={settings?.message_signature || ""}
              onChange={(e) => updateSettingsMutation.mutate({ message_signature: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
