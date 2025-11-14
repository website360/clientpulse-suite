import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useConfetti } from '@/hooks/useConfetti';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, UserCheck, Send, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StageApprovalModal } from './StageApprovalModal';

interface ProjectStagesProps {
  projectId: string;
  onUpdate: () => void;
}

export function ProjectStages({ projectId, onUpdate }: ProjectStagesProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fireMultipleConfetti } = useConfetti();
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedStageForApproval, setSelectedStageForApproval] = useState<any>(null);

  const { data: stages, isLoading } = useQuery({
    queryKey: ['project-stages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stages')
        .select(`
          *,
          project_checklist_items (
            id,
            description,
            is_completed,
            completed_at,
            order,
            notes
          ),
          project_stage_approvals (
            id,
            status,
            approved_at,
            approved_by_name,
            created_at
          )
        `)
        .eq('project_id', projectId)
        .order('order');

      if (error) throw error;
      return data;
    },
  });

  // Inicializar estados de expansão quando stages carregarem
  useEffect(() => {
    if (stages) {
      const initialExpanded: Record<string, boolean> = {};
      const currentStage = stages.find(s => s.status === 'em_andamento');
      
      stages.forEach((stage, index) => {
        // Expandido por padrão se estiver em andamento, ou se for a primeira etapa e não houver nenhuma em andamento
        initialExpanded[stage.id] = stage.status === 'em_andamento' || (!currentStage && index === 0);
      });
      setExpandedStages(initialExpanded);
    }
  }, [stages]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const expandAll = () => {
    if (stages) {
      const allExpanded: Record<string, boolean> = {};
      stages.forEach(stage => {
        allExpanded[stage.id] = true;
      });
      setExpandedStages(allExpanded);
    }
  };

  const collapseAll = () => {
    if (stages) {
      const allCollapsed: Record<string, boolean> = {};
      stages.forEach(stage => {
        allCollapsed[stage.id] = false;
      });
      setExpandedStages(allCollapsed);
    }
  };

  const areAllExpanded = stages?.every(stage => expandedStages[stage.id]) ?? false;

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ stageId, requiresApproval }: { stageId: string; requiresApproval: boolean }) => {
      const { error } = await supabase
        .from('project_stages')
        .update({ requires_client_approval: !requiresApproval })
        .eq('id', stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stages', projectId] });
      toast({
        title: 'Configuração atualizada',
        description: 'A necessidade de aprovação foi atualizada.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a configuração.',
        variant: 'destructive',
      });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted, stageBlocked }: { itemId: string; isCompleted: boolean; stageBlocked?: boolean }) => {
      if (stageBlocked) {
        throw new Error('Esta etapa está bloqueada aguardando aprovação da etapa anterior');
      }
      
      const { error } = await supabase
        .from('project_checklist_items')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
          completed_by: !isCompleted ? user?.id : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-stages', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
      onUpdate();
      
      // Verifica se completou 100% da etapa e dispara confetti
      if (!variables.isCompleted) {
        // Buscar a stage deste item
        const stageWithThisItem = stages?.find(stage => 
          stage.project_checklist_items?.some((item: any) => item.id === variables.itemId)
        );
        
        if (stageWithThisItem) {
          const items = stageWithThisItem.project_checklist_items || [];
          const completedCount = items.filter((item: any) => 
            item.id === variables.itemId || item.is_completed
          ).length;
          
          if (completedCount === items.length && items.length > 0) {
            setTimeout(() => fireMultipleConfetti(), 300);
          }
        }
      }
      
      toast({
        title: 'Item atualizado',
        description: 'O status do item foi atualizado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o item.',
        variant: 'destructive',
      });
    },
  });

  const handleRequestApproval = (stage: any) => {
    setSelectedStageForApproval(stage);
    setApprovalModalOpen(true);
  };

  const handleApprovalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['project-stages', projectId] });
    setApprovalModalOpen(false);
    setSelectedStageForApproval(null);
  };

  const getStageProgress = (stage: any) => {
    if (!stage.project_checklist_items?.length) return 0;
    const completed = stage.project_checklist_items.filter((item: any) => item.is_completed).length;
    return Math.round((completed / stage.project_checklist_items.length) * 100);
  };

  const statusColors: Record<string, string> = {
    pendente: 'bg-gray-500',
    em_andamento: 'bg-blue-500',
    concluida: 'bg-green-500',
  };

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando etapas...</div>;
  }

  if (!stages?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma etapa encontrada para este projeto
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={areAllExpanded ? collapseAll : expandAll}
        >
          {areAllExpanded ? (
            <>
              <ChevronsUp className="h-4 w-4 mr-2" />
              Recolher Todas
            </>
          ) : (
            <>
              <ChevronsDown className="h-4 w-4 mr-2" />
              Expandir Todas
            </>
          )}
        </Button>
      </div>
      
      {stages.map((stage) => {
        const progress = getStageProgress(stage);
        const items = stage.project_checklist_items || [];
        const isExpanded = expandedStages[stage.id] ?? true;
        const allCompleted = items.length > 0 && items.every((item: any) => item.is_completed);

        return (
          <Collapsible
            key={stage.id}
            open={isExpanded}
            onOpenChange={() => toggleStage(stage.id)}
          >
            <Card className={allCompleted ? 'border-green-500/50' : ''}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{stage.name}</CardTitle>
                        {allCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {(stage as any).is_blocked && (
                          <Badge variant="destructive" className="text-xs">
                            🔒 Bloqueada
                          </Badge>
                        )}
                      </div>
                      {stage.description && (
                        <CardDescription>{stage.description}</CardDescription>
                      )}
                      {(stage as any).is_blocked && (
                        <p className="text-xs text-destructive">
                          Aguardando aprovação da etapa anterior
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[stage.status]}>
                        {statusLabels[stage.status]}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {items.filter((i: any) => i.is_completed).length} de {items.length} itens concluídos
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2"
                      indicatorClassName={
                        progress >= 100 ? 'bg-green-500' :
                        progress >= 75 ? 'bg-blue-500' :
                        progress >= 50 ? 'bg-yellow-500' :
                        progress >= 25 ? 'bg-orange-500' :
                        'bg-red-500'
                      }
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Configuração e Status de Aprovação */}
                  <div className="pb-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`approval-${stage.id}`}
                          checked={stage.requires_client_approval}
                          onCheckedChange={() =>
                            toggleApprovalMutation.mutate({
                              stageId: stage.id,
                              requiresApproval: stage.requires_client_approval,
                            })
                          }
                        />
                        <Label htmlFor={`approval-${stage.id}`} className="cursor-pointer">
                          Requer aprovação do cliente
                        </Label>
                      </div>

                      {stage.requires_client_approval && (
                        <>
                          {stage.project_stage_approvals?.length > 0 ? (
                            <div className="flex items-center gap-2">
                              {stage.project_stage_approvals[0].status === 'pending' && (
                                <Badge variant="outline" className="text-yellow-600">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Aguardando aprovação
                                </Badge>
                              )}
                              {stage.project_stage_approvals[0].status === 'approved' && (
                                <Badge variant="outline" className="text-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Aprovado
                                </Badge>
                              )}
                              {stage.project_stage_approvals[0].status === 'rejected' && (
                                <Badge variant="outline" className="text-red-600">
                                  Rejeitado - Revisar
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleRequestApproval(stage)}
                              disabled={!allCompleted}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Solicitar Aprovação
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {stage.requires_client_approval && !allCompleted && (
                      <p className="text-xs text-muted-foreground">
                        Complete todos os itens antes de solicitar aprovação
                      </p>
                    )}
                  </div>

                  {/* Lista de Itens */}
                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.is_completed}
                              disabled={(stage as any).is_blocked}
                              onCheckedChange={() =>
                                toggleItemMutation.mutate({
                                  itemId: item.id,
                                  isCompleted: item.is_completed,
                                  stageBlocked: (stage as any).is_blocked,
                                })
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 space-y-1">
                              <label
                                htmlFor={item.id}
                                className={`text-sm font-medium cursor-pointer ${
                                  item.is_completed ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {item.description}
                              </label>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                              )}
                            </div>
                            {item.is_completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum item de checklist para esta etapa
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Modal de Solicitação de Aprovação */}
      {selectedStageForApproval && (
        <StageApprovalModal
          open={approvalModalOpen}
          onOpenChange={setApprovalModalOpen}
          stageId={selectedStageForApproval.id}
          stageName={selectedStageForApproval.name}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
}
