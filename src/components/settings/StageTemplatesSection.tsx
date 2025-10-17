import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      toast({ title: 'Etapa salva com sucesso' });
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
      toast({ title: 'Item de checklist salvo com sucesso' });
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
      toast({ title: 'Etapa desativada' });
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
      toast({ title: 'Item desativado' });
    },
  });

  const handleOpenStageModal = (stage?: any) => {
    if (stage) {
      setSelectedStage(stage);
      setStageFormData({
        name: stage.name || '',
        description: stage.description || '',
        order: stage.order || 0,
      });
    }
    setIsStageModalOpen(true);
  };

  const handleCloseStageModal = () => {
    setIsStageModalOpen(false);
    setSelectedStage(null);
    setStageFormData({ name: '', description: '', order: 0 });
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
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Ordem</TableHead>
                            <TableHead>Aprovação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stage.project_checklist_templates
                            .filter((item: any) => item.is_active)
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{item.order}</TableCell>
                                <TableCell>
                                  {item.requires_approval && (
                                    <Badge variant="secondary">{item.approval_type}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenChecklistModal(stage.id, item)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteChecklist.mutate(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
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
