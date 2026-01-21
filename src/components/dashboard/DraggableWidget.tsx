import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardWidget, WIDGET_CONFIGS } from '@/types/dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onChangeSize: (id: string, size: DashboardWidget['size']) => void;
  children: React.ReactNode;
}

const sizeClasses = {
  small: 'col-span-12 md:col-span-4',
  medium: 'col-span-12 md:col-span-6',
  large: 'col-span-12 md:col-span-8',
  full: 'col-span-12',
};

export function DraggableWidget({
  widget,
  isEditMode,
  onRemove,
  onChangeSize,
  children,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = WIDGET_CONFIGS[widget.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        'relative',
        isDragging && 'z-50 opacity-80',
        isEditMode && 'ring-2 ring-dashed ring-primary/30 rounded-lg'
      )}
    >
      {isEditMode && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background border rounded-full px-2 py-1 shadow-sm">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'small')}>
                Pequeno (4 colunas)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'medium')}>
                Médio (6 colunas)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'large')}>
                Grande (8 colunas)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'full')}>
                Completo (12 colunas)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemove(widget.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className={cn(
        'h-full w-full',
        isEditMode && 'pointer-events-none'
      )}>
        {children}
      </div>
    </div>
  );
}
