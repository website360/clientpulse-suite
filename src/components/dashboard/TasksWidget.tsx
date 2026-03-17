import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight,
  CheckCircle2,
  Circle,
  Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
      return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'in_progress':
      return <Timer className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
  }
};

function TaskItem({ task, isLast }: { task: Task; isLast: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-6 py-3",
      !isLast && "border-b"
    )}>
      <div className="shrink-0">
        {getStatusIcon(task.status)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[13px] font-medium truncate",
          task.status === 'done' && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.client?.nickname && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {task.client.nickname}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyTasks({ type }: { type: 'recent' | 'urgent' }) {
  return (
    <div className="flex items-center justify-center py-8 px-6">
      <p className="text-[13px] text-muted-foreground">
        {type === 'urgent' 
          ? 'Nenhuma tarefa urgente' 
          : 'Nenhuma tarefa recente'}
      </p>
    </div>
  );
}

export function TasksWidget({ recentTasks, urgentTasks }: TasksWidgetProps) {
  return (
    <div className="h-full rounded-xl border bg-card">
      <Tabs defaultValue="urgent" className="h-full flex flex-col">
        {/* Header with inline tabs */}
        <div className="px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0">
            <TabsTrigger
              value="urgent"
              className="relative rounded-none border-b-2 border-transparent px-3 py-3.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
            >
              Urgentes ({urgentTasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="relative rounded-none border-b-2 border-transparent px-3 py-3.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
            >
              Recentes ({recentTasks.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <TabsContent value="urgent" className="mt-0 h-full">
            {urgentTasks.length === 0 ? (
              <EmptyTasks type="urgent" />
            ) : (
              <div className="max-h-[280px] overflow-y-auto">
                {urgentTasks.map((task, i) => (
                  <TaskItem key={task.id} task={task} isLast={i === urgentTasks.length - 1} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-0 h-full">
            {recentTasks.length === 0 ? (
              <EmptyTasks type="recent" />
            ) : (
              <div className="max-h-[280px] overflow-y-auto">
                {recentTasks.map((task, i) => (
                  <TaskItem key={task.id} task={task} isLast={i === recentTasks.length - 1} />
                ))}
              </div>
            )}
          </TabsContent>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 mt-auto">
          <Link
            to="/tarefas"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Tabs>
    </div>
  );
}
