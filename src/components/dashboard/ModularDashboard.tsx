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
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { WidgetType, WIDGET_CONFIGS } from '@/types/dashboard';
import { DraggableWidget } from './DraggableWidget';
import { Button } from '@/components/ui/button';
import { Settings, Plus, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { QuickStatsGrid } from './QuickStats';
import { FinancialSummaryCard } from './FinancialSummaryCard';
import { TicketsOverview } from './TicketsOverview';
import { ProjectsCarousel } from './ProjectsCarousel';
import { TasksWidget } from './TasksWidget';
import { MaintenanceWidget } from './MaintenanceWidget';
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
}: ModularDashboardProps) {
  const {
    widgets,
    isEditMode,
    availableWidgets,
    reorderWidgets,
    changeWidgetSize,
    addWidget,
    removeWidget,
    resetLayout,
    toggleEditMode,
  } = useDashboardLayout();

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
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleEditMode}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditMode ? 'Salvar Layout' : 'Personalizar Dashboard'}
          </Button>
          {isEditMode && (
            <Button variant="outline" size="sm" onClick={resetLayout}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
          )}
        </div>

        {isEditMode && availableWidgets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Widget
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableWidgets.map((widgetType) => (
                <DropdownMenuItem
                  key={widgetType}
                  onClick={() => addWidget(widgetType)}
                >
                  {WIDGET_CONFIGS[widgetType].title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

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
