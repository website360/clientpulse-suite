import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { WidgetType, DashboardWidget, WidgetSize, WidgetHeight } from '@/types/dashboard';
import { DraggableWidget } from './DraggableWidget';

import { DomainsBarChart } from '@/components/charts/DomainsBarChart';
import { ContractsBarChart } from '@/components/charts/ContractsBarChart';

interface ModularDashboardProps {
  stats: any;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  financialCards: React.ReactNode;
  quickStatsContent: React.ReactNode;
  ticketsContent: React.ReactNode;
  projectsContent: React.ReactNode;
  tasksContent: React.ReactNode;
  maintenanceContent: React.ReactNode;
  // Props do hook useDashboardLayout
  widgets: DashboardWidget[];
  isEditMode: boolean;
  reorderWidgets: (activeId: string, overId: string) => void;
  changeWidgetSize: (widgetId: string, size: WidgetSize) => void;
  changeWidgetHeight: (widgetId: string, height: WidgetHeight) => void;
  removeWidget: (widgetId: string) => void;
}

export function ModularDashboard({
  stats,
  dateRange,
  financialCards,
  quickStatsContent,
  ticketsContent,
  projectsContent,
  tasksContent,
  maintenanceContent,
  widgets,
  isEditMode,
  reorderWidgets,
  changeWidgetSize,
  changeWidgetHeight,
  removeWidget,
}: ModularDashboardProps) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  const renderWidgetContent = (widgetType: WidgetType) => {
    switch (widgetType) {
      case 'quick-stats':
        return quickStatsContent;
      case 'financial-summary':
        return financialCards;
      case 'tickets-overview':
        return ticketsContent;
      case 'projects-carousel':
        return projectsContent;
      case 'tasks':
        return tasksContent;
      case 'maintenance':
        return maintenanceContent;
      case 'domains-chart':
        return <DomainsBarChart startDate={dateRange.startDate} endDate={dateRange.endDate} />;
      case 'contracts-chart':
        return <ContractsBarChart startDate={dateRange.startDate} endDate={dateRange.endDate} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-12 gap-6">
            {widgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={removeWidget}
                onChangeSize={changeWidgetSize}
                onChangeHeight={changeWidgetHeight}
              >
                {renderWidgetContent(widget.type)}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isEditMode && (
        <div className="text-sm text-muted-foreground text-center py-4 border-t">
          💡 Arraste os widgets para reorganizar. Use o menu de tamanho para ajustar as colunas. Clique em "Salvar Layout" quando terminar.
        </div>
      )}
    </div>
  );
}
