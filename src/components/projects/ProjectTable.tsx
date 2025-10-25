import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Eye } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectTableProps {
  projects: any[];
  isLoading: boolean;
  onEdit: (project: any) => void;
  onRefresh: () => void;
  hideClientColumn?: boolean;
}

export function ProjectTable({ projects, isLoading, onEdit, onRefresh, hideClientColumn = false }: ProjectTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const statusColors: Record<string, string> = {
    planejamento: 'bg-blue-500',
    em_andamento: 'bg-yellow-500',
    aguardando_aprovacao: 'bg-orange-500',
    concluido: 'bg-green-500',
    cancelado: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    planejamento: 'Planejamento',
    em_andamento: 'Em Andamento',
    aguardando_aprovacao: 'Aguardando Aprovação',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
      if (error) throw error;

      toast({
        title: 'Projeto excluído',
        description: 'O projeto foi excluído com sucesso.',
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o projeto.',
        variant: 'destructive',
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const ProjectProgress = ({ projectId }: { projectId: string }) => {
    const { data: progress } = useQuery({
      queryKey: ['project-progress', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('calculate_project_progress', { project_id_param: projectId });
        
        if (error) throw error;
        return data || 0;
      },
    });

    return (
      <div className="flex items-center gap-2 min-w-[150px]">
        <Progress 
          value={progress || 0} 
          className="h-2 flex-1"
          indicatorClassName={
            progress >= 100 ? 'bg-green-500' :
            progress >= 75 ? 'bg-blue-500' :
            progress >= 50 ? 'bg-yellow-500' :
            progress >= 25 ? 'bg-orange-500' :
            'bg-red-500'
          }
        />
        <span className="text-sm text-muted-foreground w-12">{progress || 0}%</span>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando projetos...</div>;
  }

  if (!projects.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum projeto encontrado</p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o projeto "{projectToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            {!hideClientColumn && <TableHead>Cliente</TableHead>}
            <TableHead>Projeto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            return (
              <TableRow key={project.id}>
                {!hideClientColumn && (
                  <TableCell>
                    <ClientNameCell client={project.clients || {}} />
                  </TableCell>
                )}
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" style={{ backgroundColor: `${project.project_types?.color}20`, color: project.project_types?.color }}>
                    {project.project_types?.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ProjectProgress projectId={project.id} />
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {project.due_date ? format(parseISO(project.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/projetos/${project.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setProjectToDelete({ id: project.id, name: project.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
