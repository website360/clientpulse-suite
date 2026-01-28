import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare } from "lucide-react";
import { TaskTable } from "@/components/tasks/TaskTable";
import TaskKanban from "@/components/tasks/TaskKanban";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import { TaskViewModal } from "@/components/tasks/TaskViewModal";
import TaskFilters from "@/components/tasks/TaskFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasks } from "@/components/illustrations/EmptyTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  clientId: string;
}

const Tasks = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    status: "active",
    priority: "all",
    clientId: "all",
  });

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          client:clients(id, full_name, responsible_name, company_name, client_type),
          ticket:tickets(id, ticket_number, subject)
        `)
        .order("title", { ascending: true });

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.status === "active") {
        query = query.neq("status", "done");
      } else if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters.clientId !== "all") {
        query = query.eq("client_id", filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Erro ao atualizar status da tarefa");
      return;
    }

    toast.success("Status atualizado com sucesso");
    refetch();
  };


  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleViewTask = (task: any) => {
    setViewingTask(task);
    setIsViewOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleCloseView = () => {
    setIsViewOpen(false);
    setViewingTask(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground">
              Gerencie suas tarefas e sincronize com Google Calendar
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        <TaskFilters filters={filters} onFiltersChange={setFilters} />

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Nenhuma tarefa cadastrada"
                description="Crie sua primeira tarefa para organizar seu trabalho e sincronizar com Google Calendar."
                illustration={<EmptyTasks />}
                action={{
                  label: "Nova Tarefa",
                  onClick: () => setIsFormOpen(true)
                }}
              />
            ) : (
              <TaskTable
                tasks={tasks}
                onEditTask={handleEditTask}
                onViewTask={handleViewTask}
                onRefetch={refetch}
              />
            )}
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Nenhuma tarefa cadastrada"
                description="Crie sua primeira tarefa para organizar seu trabalho e sincronizar com Google Calendar."
                illustration={<EmptyTasks />}
                action={{
                  label: "Nova Tarefa",
                  onClick: () => setIsFormOpen(true)
                }}
              />
            ) : (
              <TaskKanban
                tasks={tasks}
                onStatusChange={handleStatusChange}
                onEditTask={handleEditTask}
                onViewTask={handleViewTask}
              />
            )}
          </TabsContent>
        </Tabs>

        <TaskFormModal
          open={isFormOpen}
          onClose={handleCloseForm}
          task={editingTask}
          onSuccess={refetch}
        />

        <TaskViewModal
          open={isViewOpen}
          onClose={handleCloseView}
          task={viewingTask}
        />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
