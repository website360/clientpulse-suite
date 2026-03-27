import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
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
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function ProjectTable({ projects, isLoading, onEdit, onRefresh, hideClientColumn = false, sortColumn, sortDirection, onSort }: ProjectTableProps) {
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
      <div className="rounded-xl border bg-card py-12 text-center">
        <p className="text-[13px] text-muted-foreground">Nenhum projeto encontrado</p>
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

      <div className="space-y-2">
        {/* Header Row */}
        <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-3 bg-muted/20 rounded-xl`}>
          {!hideClientColumn && (
            <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('client_id')}>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente {sortColumn === 'client_id' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
            </div>
          )}
          <div className="col-span-3 cursor-pointer" onClick={() => onSort?.('name')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Projeto {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort?.('project_type_id')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo {sortColumn === 'project_type_id' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('progress')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Progresso {sortColumn === 'progress' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('status')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 cursor-pointer" onClick={() => onSort?.('due_date')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prazo {sortColumn === 'due_date' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Project Rows as Cards */}
        {projects.map((project, index) => (
          <Card 
            key={project.id}
            onClick={() => navigate(`/projetos/${project.id}`)}
            className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className={`grid ${hideClientColumn ? 'grid-cols-10' : 'grid-cols-12'} gap-4 px-6 py-4 items-center`}>
              {!hideClientColumn && (
                <div className="col-span-2">
                  <ClientNameCell client={project.clients || {}} />
                </div>
              )}
              <div className="col-span-3">
                <p className="text-[14px] font-medium text-foreground">{project.name}</p>
              </div>
              <div className="col-span-1">
                <Badge variant="outline" className="text-[12px] whitespace-nowrap" style={{ backgroundColor: `${project.project_types?.color}20`, color: project.project_types?.color }}>
                  {project.project_types?.name}
                </Badge>
              </div>
              <div className="col-span-2">
                <ProjectProgress projectId={project.id} />
              </div>
              <div className="col-span-2">
                <Badge className={`${statusColors[project.status]} text-[12px]`}>
                  {statusLabels[project.status]}
                </Badge>
              </div>
              <div className="col-span-1">
                <p className="text-[14px] text-muted-foreground">
                  {project.due_date ? format(parseISO(project.due_date), 'dd/MM/yy', { locale: ptBR }) : '-'}
                </p>
              </div>
              <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projetos/${project.id}`); }} className="rounded-lg px-3 py-2.5 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="rounded-lg px-3 py-2.5 cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setProjectToDelete({ id: project.id, name: project.name }); }}
                      className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
