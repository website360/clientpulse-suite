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
import { Edit, Trash2, Link2, MoreVertical } from 'lucide-react';
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
  onRefetch: () => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function TaskTable({ tasks, onEditTask, onRefetch, sortColumn, sortDirection, onSort }: TaskTableProps) {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "secondary" | "default" | "outline"; className?: string }> = {
      todo: { label: 'A Fazer', variant: 'secondary' },
      in_progress: { label: 'Em Andamento', variant: 'default' },
      done: { label: 'Concluído', variant: 'outline', className: 'bg-success/10 border-success text-success' },
    };
    const config = statusMap[status] || statusMap.todo;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      high: { label: 'Alta', variant: 'destructive' as const },
      medium: { label: 'Média', variant: 'default' as const },
      low: { label: 'Baixa', variant: 'outline' as const },
    };
    const config = priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <Card className="card-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="client_id" label="Cliente" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="title" label="Tarefa" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="priority" label="Prioridade" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task, index) => (
              <TableRow 
                key={task.id}
                className="hover:bg-muted/30 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  {task.client ? (
                    <ClientNameCell client={task.client} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    {task.ticket && (
                      <Badge variant="outline" className="gap-1">
                        <Link2 className="h-3 w-3" />
                        #{task.ticket.ticket_number}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(task.status)}</TableCell>
                <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteTaskId(task.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
