import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Link2, Cloud, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: any;
  onClick: () => void;
  isDragging?: boolean;
}

const TaskCard = ({ task, onClick, isDragging = false }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border bg-card space-y-2 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm flex-1">{task.title}</h4>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
          {getPriorityLabel(task.priority)}
        </Badge>
        {task.ticket && (
          <Badge 
            variant="outline" 
            className="text-xs gap-1 cursor-pointer hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/tickets/${task.ticket.id}`;
            }}
          >
            <Link2 className="h-3 w-3" />
            #{task.ticket.ticket_number}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
          </div>
        )}
        {task.assigned_profile && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assigned_profile.avatar_url} />
            <AvatarFallback className="text-[8px]">
              {task.assigned_profile.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
