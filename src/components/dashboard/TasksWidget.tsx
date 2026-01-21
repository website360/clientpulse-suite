import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ListTodo, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  Circle,
  Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AvatarInitials } from '@/components/ui/avatar-initials';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  client?: {
    id: string;
    nickname: string;
  };
  assigned_to_profile?: {
    full_name: string;
  };
}

interface TasksWidgetProps {
  recentTasks: Task[];
  urgentTasks: Task[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'in_progress':
      return <Timer className="h-4 w-4 text-blue-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'todo': 'A fazer',
    'in_progress': 'Em progresso',
    'done': 'Concluída',
    'cancelled': 'Cancelada'
  };
  return statusMap[status] || status;
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="text-xs">Média</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Baixa</Badge>;
  }
};

function TaskItem({ task }: { task: Task }) {
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg p-3",
      "hover:bg-muted/50 transition-colors",
      "border-b border-border/50 last:border-0"
    )}>
      <div className="pt-0.5">
        {getStatusIcon(task.status)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium truncate",
            task.status === 'done' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {getPriorityBadge(task.priority)}
        </div>
        {task.client?.nickname && (
          <div className="flex items-center gap-2">
            <AvatarInitials name={task.client.nickname} size="xs" />
            <span className="text-xs text-muted-foreground">
              {task.client.nickname}
            </span>
          </div>
        )}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {task.description}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyTasks({ type }: { type: 'recent' | 'urgent' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {type === 'urgent' ? (
        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
      ) : (
        <ListTodo className="h-10 w-10 text-muted-foreground/50 mb-3" />
      )}
      <p className="text-sm text-muted-foreground">
        {type === 'urgent' 
          ? 'Nenhuma tarefa urgente' 
          : 'Nenhuma tarefa recente'}
      </p>
    </div>
  );
}

export function TasksWidget({ recentTasks, urgentTasks }: TasksWidgetProps) {
  return (
    <Card className="h-full border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-amber-500/10 p-2">
              <ListTodo className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-base font-semibold">Tarefas</CardTitle>
          </div>
          <Link to="/tarefas">
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="urgent" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="urgent" className="text-xs">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Urgentes ({urgentTasks.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Recentes ({recentTasks.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="urgent" className="mt-0">
            {urgentTasks.length === 0 ? (
              <EmptyTasks type="urgent" />
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                {urgentTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent" className="mt-0">
            {recentTasks.length === 0 ? (
              <EmptyTasks type="recent" />
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                {recentTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
