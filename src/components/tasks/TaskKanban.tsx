import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import TaskCard from "./TaskCard";
import { Badge } from "@/components/ui/badge";

interface TaskKanbanProps {
  tasks: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onEditTask: (task: any) => void;
}

const TaskKanban = ({ tasks, onStatusChange, onEditTask }: TaskKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = [
    { id: "todo", label: "A Fazer", status: "todo" },
    { id: "in_progress", label: "Em Andamento", status: "in_progress" },
    { id: "done", label: "Concluído", status: "done" },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setActiveId(null);
      return;
    }

    // Check if dropped over a column or another task
    let newStatus = task.status;
    
    // If dropped on a column directly
    if (["todo", "in_progress", "done"].includes(overId)) {
      newStatus = overId;
    } else {
      // If dropped on another task, get that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }
    
    if (newStatus !== task.status) {
      onStatusChange(taskId, newStatus);
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  // Componente para coluna com área de drop
  const DroppableColumn = ({ column, children }: { column: any; children: React.ReactNode }) => {
    const { setNodeRef } = useDroppable({
      id: column.id,
    });

    return (
      <div
        ref={setNodeRef}
        className="flex flex-col gap-3 p-4 rounded-lg bg-muted/30 min-h-[400px]"
      >
        {children}
      </div>
    );
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.status);
          
          return (
            <DroppableColumn key={column.id} column={column}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{column.label}</h3>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>
              
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 flex-1">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onEditTask(task)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragging />}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskKanban;
