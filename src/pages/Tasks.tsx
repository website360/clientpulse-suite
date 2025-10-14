import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TaskList from "@/components/tasks/TaskList";
import TaskKanban from "@/components/tasks/TaskKanban";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import TaskFilters from "@/components/tasks/TaskFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  assignedTo: string;
  clientId: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

const Tasks = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    status: "active",
    priority: "all",
    assignedTo: "all",
    clientId: "all",
    dateRange: { from: undefined, to: undefined },
  });

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          client:clients(id, full_name, nickname, company_name),
          ticket:tickets(id, ticket_number, subject)
        `)
        .order("created_at", { ascending: false });

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
      if (filters.assignedTo !== "all") {
        query = query.eq("assigned_to", filters.assignedTo);
      }
      if (filters.clientId !== "all") {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters.dateRange.from) {
        query = query.gte("due_date", filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        query = query.lte("due_date", filters.dateRange.to.toISOString());
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

  const handleDateChange = async (taskId: string, newDate: Date) => {
    const { error } = await supabase
      .from("tasks")
      .update({ 
        due_date: newDate.toISOString(),
        start_time: newDate.toISOString(),
        end_time: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString()
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Erro ao atualizar data da tarefa");
      return;
    }

    toast.success("Data atualizada com sucesso");
    refetch();
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
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
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <TaskList
              tasks={tasks}
              onEditTask={handleEditTask}
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            <TaskKanban
              tasks={tasks}
              onStatusChange={handleStatusChange}
              onEditTask={handleEditTask}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <TaskCalendar
              tasks={tasks}
              onEditTask={handleEditTask}
              onRefetch={refetch}
              onDateChange={handleDateChange}
            />
          </TabsContent>
        </Tabs>

        <TaskFormModal
          open={isFormOpen}
          onClose={handleCloseForm}
          task={editingTask}
          onSuccess={refetch}
        />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
