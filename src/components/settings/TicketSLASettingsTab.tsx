import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Pencil, Trash2, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";

const slaConfigSchema = z.object({
  department_id: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  first_response_minutes: z.number().min(1, "Tempo de primeira resposta deve ser maior que 0"),
  resolution_minutes: z.number().min(1, "Tempo de resolução deve ser maior que 0"),
});

type SLAConfigFormData = z.infer<typeof slaConfigSchema>;

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function TicketSLASettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState<SLAConfigFormData>({
    department_id: null,
    priority: 'medium',
    first_response_minutes: 60,
    resolution_minutes: 480,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ticket-sla-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_sla_configs")
        .select(`
          *,
          departments (
            id,
            name,
            color
          )
        `)
        .order("priority");

      if (error) throw error;
      return data;
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: async (data: SLAConfigFormData) => {
      const { error } = await supabase
        .from("ticket_sla_configs")
        .insert({
          department_id: data.department_id,
          priority: data.priority,
          first_response_minutes: data.first_response_minutes,
          resolution_minutes: data.resolution_minutes,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-sla-configs"] });
      toast({
        title: "Configuração SLA criada",
        description: "A configuração foi criada com sucesso.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar configuração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SLAConfigFormData & { is_active: boolean }> }) => {
      const { error } = await supabase
        .from("ticket_sla_configs")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-sla-configs"] });
      toast({
        title: "Configuração SLA atualizada",
        description: "A configuração foi atualizada com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_sla_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-sla-configs"] });
      toast({
        title: "Configuração SLA excluída",
        description: "A configuração foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir configuração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      department_id: null,
      priority: 'medium',
      first_response_minutes: 60,
      resolution_minutes: 480,
    });
    setFormErrors({});
    setEditingConfig(null);
  };

  const handleOpenDialog = (config?: any) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        department_id: config.department_id,
        priority: config.priority,
        first_response_minutes: config.first_response_minutes,
        resolution_minutes: config.resolution_minutes,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    try {
      const validated = slaConfigSchema.parse(formData);
      setFormErrors({});

      if (editingConfig) {
        updateConfigMutation.mutate({ id: editingConfig.id, data: validated });
      } else {
        createConfigMutation.mutate(validated);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      }
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateConfigMutation.mutate({ id, data: { is_active: isActive } });
  };

  const minutesToReadable = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure os tempos de SLA (Service Level Agreement) para primeira resposta e resolução de tickets.
          Você pode definir diferentes tempos para cada prioridade e departamento.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Configurações de SLA</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os tempos esperados de resposta e resolução
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      {configs && configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira configuração de SLA
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Configuração
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs?.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={PRIORITY_COLORS[config.priority]}>
                        {PRIORITY_LABELS[config.priority]}
                      </Badge>
                      {config.departments && (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: config.departments.color,
                            color: config.departments.color,
                          }}
                        >
                          {config.departments.name}
                        </Badge>
                      )}
                      {!config.departments && (
                        <Badge variant="outline">Todos os Departamentos</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Primeira Resposta: <strong>{minutesToReadable(config.first_response_minutes)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Resolução: <strong>{minutesToReadable(config.resolution_minutes)}</strong>
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`active-${config.id}`} className="text-sm">
                        Ativo
                      </Label>
                      <Switch
                        id={`active-${config.id}`}
                        checked={config.is_active}
                        onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta configuração?')) {
                          deleteConfigMutation.mutate(config.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar' : 'Nova'} Configuração de SLA
            </DialogTitle>
            <DialogDescription>
              Defina os tempos de resposta e resolução esperados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select
                value={formData.department_id || 'all'}
                onValueChange={(value) =>
                  setFormData({ ...formData, department_id: value === 'all' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Departamentos</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_response">
                Tempo de Primeira Resposta (minutos)
              </Label>
              <Input
                id="first_response"
                type="number"
                min="1"
                value={formData.first_response_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    first_response_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
              {formErrors.first_response_minutes && (
                <p className="text-sm text-destructive">{formErrors.first_response_minutes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Tempo esperado: {minutesToReadable(formData.first_response_minutes)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">
                Tempo de Resolução (minutos)
              </Label>
              <Input
                id="resolution"
                type="number"
                min="1"
                value={formData.resolution_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
              {formErrors.resolution_minutes && (
                <p className="text-sm text-destructive">{formErrors.resolution_minutes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Tempo esperado: {minutesToReadable(formData.resolution_minutes)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
            >
              {editingConfig ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
