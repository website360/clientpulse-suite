import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, Eye } from 'lucide-react';
import { BlockLibrary } from './BlockLibrary';
import { BlockProperties } from './BlockProperties';
import { EmailBlock } from './EmailBlock';
import { ThemeSelector } from './ThemeSelector';
import { BlockData } from './types';
import { BLOCK_TEMPLATES } from './blockTemplates';
import { EMAIL_THEMES, EmailTheme, applyThemeToBlock } from './themes';

function DroppableCanvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] transition-colors ${
        isOver ? 'bg-primary/5' : ''
      }`}
    >
      {children}
    </div>
  );
}

interface VisualEmailEditorProps {
  initialBlocks?: BlockData[];
  onSave: (blocks: BlockData[], html: string) => void;
  onCancel: () => void;
}

export function VisualEmailEditor({ initialBlocks = [], onSave, onCancel }: VisualEmailEditorProps) {
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<EmailTheme>(EMAIL_THEMES[0]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dragging a new block from library
    if (active.data.current?.isNew) {
      const template = BLOCK_TEMPLATES.find(
        (t) => t.type === active.data.current?.type
      );
      if (!template) return;

      const newBlock: BlockData = {
        id: `block-${Date.now()}`,
        type: template.type,
        name: template.name,
        content: template.defaultContent,
        properties: applyThemeToBlock(
          template.type,
          { ...template.defaultProperties },
          currentTheme
        ),
      };

      setBlocks((prev) => [...prev, newBlock]);
      setSelectedBlockId(newBlock.id);
      return;
    }

    // Reorder existing blocks
    if (active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpdateBlock = (blockId: string, properties: Record<string, any>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, properties } : block
      )
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleThemeChange = (theme: EmailTheme) => {
    setCurrentTheme(theme);
    
    // Apply theme to all existing blocks
    setBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        properties: applyThemeToBlock(block.type, block.properties, theme),
      }))
    );
  };

  const generateHtml = (): string => {
    const htmlParts = blocks.map((block) => {
      let html = block.content;
      Object.entries(block.properties).forEach(([key, value]) => {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
      return html;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td>
${htmlParts.join('\n')}
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleSave = () => {
    const html = generateHtml();
    onSave(blocks, html);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[600px] border rounded-lg overflow-hidden">
        <BlockLibrary />

        <div className="flex-1 flex flex-col bg-background">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold">Canvas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {blocks.length} bloco{blocks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ThemeSelector
                selectedThemeId={currentTheme.id}
                onThemeChange={handleThemeChange}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Code2 className="h-4 w-4 mr-2" />
                Salvar HTML
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <DroppableCanvas>
              {blocks.length === 0 ? (
                <div className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center max-w-sm">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Arraste blocos da biblioteca para começar a construir seu template
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {blocks.map((block) => (
                      <EmailBlock
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </DroppableCanvas>
          </ScrollArea>
        </div>

        <BlockProperties
          block={selectedBlock}
          onUpdate={handleUpdateBlock}
          onDelete={handleDeleteBlock}
        />
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-background border rounded-lg p-3 shadow-lg opacity-80">
            Arrastando...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
