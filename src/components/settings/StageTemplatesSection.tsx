import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast, toastSuccess } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, List, UserCheck, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function StageTemplatesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [stageFormData, setStageFormData] = useState({
    name: '',
    description: '',
    order: 0,
    requires_client_approval: false,
  });
  const [checklistFormData, setChecklistFormData] = useState({
    description: '',
    order: 0,
    requires_approval: false,
    approval_type: '',
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['project-types-for-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ['project-stage-templates', selectedProjectType],
    queryFn: async () => {
      if (!selectedProjectType) return [];
      const { data, error } = await supabase
        .from('project_stage_templates')
        .select(`
          *,
          project_checklist_templates (
            id,
            description,
            order,
            requires_approval,
            approval_type,
            is_active
          )
        `)
        .eq('project_type_id', selectedProjectType)
        .order('order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectType,
  });

  const saveStageMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedStage) {
        const { error } = await supabase
          .from('project_stage_templates')
          .update(data)
          .eq('id', selectedStage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_stage_templates')
          .insert([{ ...data, project_type_id: selectedProjectType }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stage-templates'] });
      toastSuccess('Etapa salva', 'Etapa salva com sucesso');
      handleCloseStageModal();
    },
  });

  const saveChecklistMutation = useMutation({
    mutationFn: async ({ stageId, data }: any) => {
      if (selectedChecklist) {
        const { error } = await supabase
          .from('project_checklist_templates')
          .update(data)
          .eq('id', selectedChecklist.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_checklist_templates')
          .insert([{ ...data, stage_template_id: stageId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stage-templates'] });
      toastSuccess('Item salvo', 'Item de checklist salvo com sucesso');
      handleCloseChecklistModal();
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_stage_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stage-templates'] });
      toastSuccess('Etapa desativada', 'Etapa desativada');
    },
  });

  const deleteChecklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_checklist_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stage-templates'] });
      toastSuccess('Item desativado', 'Item desativado');
    },
  });

  const handleOpenStageModal = (stage?: any) => {
    if (stage) {
      setSelectedStage(stage);
      setStageFormData({
        name: stage.name || '',
        description: stage.description || '',
        order: stage.order || 0,
        requires_client_approval: stage.requires_client_approval || false,
      });
    }
    setIsStageModalOpen(true);
  };

  const handleCloseStageModal = () => {
    setIsStageModalOpen(false);
    setSelectedStage(null);
    setStageFormData({ name: '', description: '', order: 0, requires_client_approval: false });
  };

  const handleOpenChecklistModal = (stageId: string, checklist?: any) => {
    setSelectedStage({ id: stageId });
    if (checklist) {
      setSelectedChecklist(checklist);
      setChecklistFormData({
        description: checklist.description || '',
        order: checklist.order || 0,
        requires_approval: checklist.requires_approval || false,
        approval_type: checklist.approval_type || '',
      });
    }
    setIsChecklistModalOpen(true);
  };

  const handleCloseChecklistModal = () => {
    setIsChecklistModalOpen(false);
    setSelectedChecklist(null);
    setChecklistFormData({
      description: '',
      order: 0,
      requires_approval: false,
      approval_type: '',
    });
  };

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStageMutation.mutate(stageFormData);
  };

  const handleChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveChecklistMutation.mutate({
      stageId: selectedStage.id,
      data: checklistFormData,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Templates de Etapas</CardTitle>
          <CardDescription>
            Gerencie as etapas padrão para cada tipo de projeto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecione o Tipo de Projeto</Label>
            <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um tipo de projeto" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectType && (
            <div className="flex justify-end">
              <Button onClick={() => handleOpenStageModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Etapa
              </Button>
            </div>
          )}

          {stages && stages.length > 0 && (
            <div className="space-y-4">
              {stages.map((stage) => (
                <Card key={stage.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {stage.name}
                          {stage.requires_client_approval && (
                            <Badge variant="outline" className="text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Requer aprovação
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{stage.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenChecklistModal(stage.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Item
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenStageModal(stage)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStage.mutate(stage.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {stage.project_checklist_templates && stage.project_checklist_templates.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-muted/20 rounded-xl">
                          <div className="col-span-5"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição</span></div>
                          <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ordem</span></div>
                          <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aprovação</span></div>
                          <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
                        </div>
                        {stage.project_checklist_templates
                          .filter((item: any) => item.is_active)
                          .sort((a: any, b: any) => a.order - b.order)
                          .map((item: any, idx: number) => (
                            <Card key={item.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${idx * 30}ms` }}>
                              <div className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center">
                                <div className="col-span-5"><p className="text-[14px] text-foreground">{item.description}</p></div>
                                <div className="col-span-2"><p className="text-[13px] text-muted-foreground">{item.order}</p></div>
                                <div className="col-span-3">{item.requires_approval && <Badge variant="secondary">{item.approval_type}</Badge>}</div>
                                <div className="col-span-2 flex justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                                      <DropdownMenuItem onClick={() => handleOpenChecklistModal(stage.id, item)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => deleteChecklist.mutate(item.id)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Desativar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {selectedProjectType && (!stages || stages.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma etapa cadastrada para este tipo de projeto
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStageModalOpen} onOpenChange={handleCloseStageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStage && selectedStage.name ? 'Editar Etapa' : 'Nova Etapa'}
            </DialogTitle>
            <DialogDescription>
              Defina as etapas do template de projeto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStageSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={stageFormData.name}
                onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={stageFormData.description}
                onChange={(e) => setStageFormData({ ...stageFormData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="order">Ordem</Label>
              <Input
                id="order"
                type="number"
                value={stageFormData.order}
                onChange={(e) => setStageFormData({ ...stageFormData, order: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="requires_approval">Requer aprovação do cliente</Label>
                <p className="text-sm text-muted-foreground">
                  Projetos criados com esta etapa vão requerer aprovação formal do cliente
                </p>
              </div>
              <Switch
                id="requires_approval"
                checked={stageFormData.requires_client_approval}
                onCheckedChange={(checked) =>
                  setStageFormData({ ...stageFormData, requires_client_approval: checked })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseStageModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveStageMutation.isPending}>
                {saveStageMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isChecklistModalOpen} onOpenChange={handleCloseChecklistModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedChecklist ? 'Editar Item' : 'Novo Item de Checklist'}
            </DialogTitle>
            <DialogDescription>
              Adicione itens de checklist para esta etapa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChecklistSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={checklistFormData.description}
                onChange={(e) => setChecklistFormData({ ...checklistFormData, description: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="order">Ordem</Label>
              <Input
                id="order"
                type="number"
                value={checklistFormData.order}
                onChange={(e) => setChecklistFormData({ ...checklistFormData, order: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_approval"
                checked={checklistFormData.requires_approval}
                onChange={(e) => setChecklistFormData({ ...checklistFormData, requires_approval: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="requires_approval">Requer Aprovação</Label>
            </div>
            {checklistFormData.requires_approval && (
              <div>
                <Label htmlFor="approval_type">Tipo de Aprovação</Label>
                <Input
                  id="approval_type"
                  value={checklistFormData.approval_type}
                  onChange={(e) => setChecklistFormData({ ...checklistFormData, approval_type: e.target.value })}
                  placeholder="Ex: Cliente, Gerente"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseChecklistModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveChecklistMutation.isPending}>
                {saveChecklistMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
