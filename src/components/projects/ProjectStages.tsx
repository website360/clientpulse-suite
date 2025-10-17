import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface ProjectStagesProps {
  projectId: string;
  onUpdate: () => void;
}

export function ProjectStages({ projectId, onUpdate }: ProjectStagesProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
          )
        `)
        .eq('project_id', projectId)
        .order('order');

      if (error) throw error;
      return data;
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-stages', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
      onUpdate();
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

  const getStageProgress = (stage: any) => {
    if (!stage.project_checklist_items?.length) return 0;
    const completed = stage.project_checklist_items.filter((item: any) => item.is_completed).length;
    return Math.round((completed / stage.project_checklist_items.length) * 100);
  };

  const statusColors: Record<string, string> = {
    pendente: 'bg-gray-500',
    em_andamento: 'bg-blue-500',
    concluido: 'bg-green-500',
  };

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
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
      {stages.map((stage) => {
        const progress = getStageProgress(stage);
        const items = stage.project_checklist_items || [];

        return (
          <Card key={stage.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{stage.name}</CardTitle>
                  {stage.description && (
                    <CardDescription>{stage.description}</CardDescription>
                  )}
                </div>
                <Badge className={statusColors[stage.status]}>
                  {statusLabels[stage.status]}
                </Badge>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {items.filter((i: any) => i.is_completed).length} de {items.length} itens concluídos
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent>
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
                          onCheckedChange={() =>
                            toggleItemMutation.mutate({
                              itemId: item.id,
                              isCompleted: item.is_completed,
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
          </Card>
        );
      })}
    </div>
  );
}
