import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Link2, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskListProps {
  tasks: any[];
  onEditTask: (task: any) => void;
  onRefetch: () => void;
}

const TaskList = ({ tasks, onEditTask, onRefetch }: TaskListProps) => {
  const groupTasks = (tasks: any[]) => {
    const groups = {
      today: [] as any[],
      tomorrow: [] as any[],
      thisWeek: [] as any[],
      upcoming: [] as any[],
      noDate: [] as any[],
    };

    tasks.forEach((task) => {
      if (!task.due_date) {
        groups.noDate.push(task);
      } else {
        const dueDate = new Date(task.due_date);
        if (isToday(dueDate)) {
          groups.today.push(task);
        } else if (isTomorrow(dueDate)) {
          groups.tomorrow.push(task);
        } else if (isThisWeek(dueDate)) {
          groups.thisWeek.push(task);
        } else {
          groups.upcoming.push(task);
        }
      }
    });

    return groups;
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Erro ao atualizar tarefa");
      return;
    }

    toast.success(newStatus === "done" ? "Tarefa concluída!" : "Tarefa reaberta");
    onRefetch();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return priority;
    }
  };

  const renderTaskGroup = (title: string, tasks: any[]) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => onEditTask(task)}
            >
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </h4>
                  <Badge variant={getPriorityColor(task.priority)}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                  {task.google_event_id && (
                    <Badge variant="outline" className="gap-1">
                      <Cloud className="h-3 w-3" />
                      Google
                    </Badge>
                  )}
                  {task.ticket && (
                    <Badge variant="outline" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      #{task.ticket.ticket_number}
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), "dd MMM yyyy", { locale: ptBR })}
                    </div>
                  )}
                  {task.assigned_profile && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={task.assigned_profile.avatar_url} />
                        <AvatarFallback>
                          {task.assigned_profile.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{task.assigned_profile.full_name}</span>
                    </div>
                  )}
                  {task.client && (
                    <span className="text-xs">
                      {task.client.nickname || task.client.company_name || task.client.full_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const grouped = groupTasks(tasks);

  return (
    <div className="space-y-6">
      {renderTaskGroup("Hoje", grouped.today)}
      {renderTaskGroup("Amanhã", grouped.tomorrow)}
      {renderTaskGroup("Esta Semana", grouped.thisWeek)}
      {renderTaskGroup("Próximas", grouped.upcoming)}
      {renderTaskGroup("Sem Data", grouped.noDate)}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma tarefa encontrada
        </div>
      )}
    </div>
  );
};

export default TaskList;
