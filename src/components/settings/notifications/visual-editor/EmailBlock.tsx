import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { BlockData } from './types';
import { BLOCK_TEMPLATES } from './blockTemplates';

interface EmailBlockProps {
  block: BlockData;
  isSelected: boolean;
  onSelect: () => void;
}

export function EmailBlock({ block, isSelected, onSelect }: EmailBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const template = BLOCK_TEMPLATES.find((t) => t.type === block.type);
  
  // Replace template variables with actual properties
  let renderedContent = block.content;
  Object.entries(block.properties).forEach(([key, value]) => {
    renderedContent = renderedContent.replace(
      new RegExp(`{{${key}}}`, 'g'),
      String(value)
    );
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative border rounded-lg overflow-hidden transition-all ${
        isSelected
          ? 'ring-2 ring-primary border-primary'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 bg-muted/50 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-8 pr-4 py-2">
        <div className="text-xs text-muted-foreground mb-1 font-medium">
          {template?.name}
        </div>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>
    </div>
  );
}
