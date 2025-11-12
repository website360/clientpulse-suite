import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Icons from 'lucide-react';
import { BLOCK_TEMPLATES } from './blockTemplates';

function DraggableBlock({ template }: { template: typeof BLOCK_TEMPLATES[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-${template.type}`,
    data: { type: template.type, isNew: true },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = Icons[template.icon as keyof typeof Icons] as any;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="p-3 hover:bg-accent transition-colors">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{template.name}</span>
        </div>
      </Card>
    </div>
  );
}

export function BlockLibrary() {
  const categories = [...new Set(BLOCK_TEMPLATES.map((t) => t.category))];

  return (
    <div className="border-r bg-muted/30 w-64 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Biblioteca de Blocos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para o canvas
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <Badge variant="secondary" className="mb-2 text-xs">
                {category}
              </Badge>
              <div className="space-y-2">
                {BLOCK_TEMPLATES.filter((t) => t.category === category).map((template) => (
                  <DraggableBlock key={template.type} template={template} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
