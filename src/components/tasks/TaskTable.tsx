import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Link2, MoreVertical, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
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

interface TaskTableProps {
  tasks: any[];
  onEditTask: (task: any) => void;
  onViewTask: (task: any) => void;
  onRefetch: () => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function TaskTable({ tasks, onEditTask, onViewTask, onRefetch, sortColumn, sortDirection, onSort }: TaskTableProps) {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { badge: string; dot: string; label: string }> = {
      todo: {
        badge: 'bg-slate-50 text-slate-700 border-0 hover:bg-slate-50',
        dot: 'h-2 w-2 fill-slate-400 text-slate-400',
        label: 'A Fazer',
      },
      in_progress: {
        badge: 'bg-blue-50 text-blue-700 border-0 hover:bg-blue-50',
        dot: 'h-2 w-2 fill-blue-500 text-blue-500',
        label: 'Em Andamento',
      },
      done: {
        badge: 'bg-green-50 text-green-700 border-0 hover:bg-green-50',
        dot: 'h-2 w-2 fill-green-500 text-green-500',
        label: 'Concluído',
      },
    };
    const config = styles[status] || styles.todo;
    return (
      <Badge variant="default" className={`${config.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Circle className={config.dot} />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { badge: string; dot: string; label: string }> = {
      high: {
        badge: 'bg-red-50 text-red-700 border-0 hover:bg-red-50',
        dot: 'h-2 w-2 fill-red-500 text-red-500',
        label: 'Alta',
      },
      medium: {
        badge: 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50',
        dot: 'h-2 w-2 fill-amber-500 text-amber-500',
        label: 'Média',
      },
      low: {
        badge: 'bg-gray-100 text-gray-600 border-0 hover:bg-gray-100',
        dot: 'h-2 w-2 fill-gray-400 text-gray-400',
        label: 'Baixa',
      },
    };
    const config = styles[priority] || styles.medium;
    return (
      <Badge variant="default" className={`${config.badge} font-medium px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Circle className={config.dot} />
        {config.label}
      </Badge>
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      toast.error('Erro ao excluir tarefa');
      return;
    }

    toast.success('Tarefa excluída com sucesso');
    setDeleteTaskId(null);
    onRefetch();
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
          <div className="col-span-3 cursor-pointer" onClick={() => onSort?.('client_id')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente {sortColumn === 'client_id' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-4 cursor-pointer" onClick={() => onSort?.('title')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tarefa {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('status')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort?.('priority')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prioridade {sortColumn === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Task Rows as Cards */}
        {tasks.map((task, index) => (
          <Card 
            key={task.id}
            onClick={() => onViewTask(task)}
            className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              {/* Cliente */}
              <div className="col-span-3">
                {task.client ? (
                  <ClientNameCell client={task.client} />
                ) : (
                  <span className="text-[14px] text-muted-foreground">-</span>
                )}
              </div>

              {/* Tarefa */}
              <div className="col-span-4">
                <div className="space-y-1">
                  <p className="text-[14px] font-medium text-foreground">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                  {task.ticket && (
                    <Badge variant="outline" className="gap-1 text-[12px]">
                      <Link2 className="h-3 w-3" />
                      #{task.ticket.ticket_number}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2">
                {getStatusBadge(task.status)}
              </div>

              {/* Prioridade */}
              <div className="col-span-2">
                {getPriorityBadge(task.priority)}
              </div>

              {/* Ações */}
              <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                      className="rounded-lg px-3 py-2.5 cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
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

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
