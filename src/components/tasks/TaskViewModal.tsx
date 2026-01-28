import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Link2, Clock, AlertCircle } from "lucide-react";
import { ClientNameCell } from "@/components/shared/ClientNameCell";

interface TaskViewModalProps {
  open: boolean;
  onClose: () => void;
  task?: any;
}

export function TaskViewModal({ open, onClose, task }: TaskViewModalProps) {
  if (!task) return null;

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

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Detalhes da Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Título e Status */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">{task.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
          </div>

          {/* Descrição */}
          {task.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Descrição</h3>
              <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg">
                {task.description}
              </p>
            </div>
          )}

          {/* Informações Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            {task.client && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Cliente</span>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <ClientNameCell client={task.client} />
                </div>
              </div>
            )}

            {/* Ticket Relacionado */}
            {task.ticket && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  <span className="font-medium">Ticket Relacionado</span>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <Badge variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    #{task.ticket.ticket_number}
                  </Badge>
                  <p className="text-sm mt-1">{task.ticket.subject}</p>
                </div>
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data de Criação */}
            {task.created_at && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Data de Criação</span>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {formatDate(task.created_at)}
                </p>
              </div>
            )}

            {/* Data de Atualização */}
            {task.updated_at && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Última Atualização</span>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {formatDate(task.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Data de Vencimento */}
          {task.due_date && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Data de Vencimento</span>
              </div>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">
                {formatDate(task.due_date)}
              </p>
            </div>
          )}

          {/* ID da Tarefa */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">ID da Tarefa</span>
            </div>
            <p className="text-sm bg-muted/50 p-3 rounded-lg font-mono">
              {task.id}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
