import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Columns, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardWidget, WidgetSize, WidgetHeight, WIDGET_CONFIGS } from '@/types/dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onChangeSize: (id: string, size: WidgetSize) => void;
  onChangeHeight: (id: string, height: WidgetHeight) => void;
  children: React.ReactNode;
}

const sizeClasses = {
  small: 'col-span-12 md:col-span-4',
  medium: 'col-span-12 md:col-span-6',
  large: 'col-span-12 md:col-span-8',
  full: 'col-span-12',
};

const heightClasses = {
  auto: '',
  small: 'h-[200px]',
  medium: 'h-[300px]',
  large: 'h-[400px]',
};

const heightLabels = {
  auto: 'Automática',
  small: 'Pequena (200px)',
  medium: 'Média (300px)',
  large: 'Grande (400px)',
};

const sizeLabels = {
  small: 'Pequeno (4 colunas)',
  medium: 'Médio (6 colunas)',
  large: 'Grande (8 colunas)',
  full: 'Completo (12 colunas)',
};

export function DraggableWidget({
  widget,
  isEditMode,
  onRemove,
  onChangeSize,
  onChangeHeight,
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
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Largura">
                <Columns className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Largura</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(sizeLabels) as WidgetSize[]).map((size) => (
                <DropdownMenuItem 
                  key={size} 
                  onClick={() => onChangeSize(widget.id, size)}
                  className={widget.size === size ? 'bg-accent' : ''}
                >
                  {sizeLabels[size]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Altura">
                <Rows className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Altura</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(heightLabels) as WidgetHeight[]).map((height) => (
                <DropdownMenuItem 
                  key={height} 
                  onClick={() => onChangeHeight(widget.id, height)}
                  className={widget.height === height ? 'bg-accent' : ''}
                >
                  {heightLabels[height]}
                </DropdownMenuItem>
              ))}
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
        'w-full overflow-auto [&>*]:h-full',
        widget.height === 'auto' ? '' : heightClasses[widget.height],
        isEditMode && 'pointer-events-none'
      )}>
        {children}
      </div>
    </div>
  );
}
