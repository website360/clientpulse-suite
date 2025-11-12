import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { BlockData } from './types';
import { BLOCK_TEMPLATES } from './blockTemplates';

interface BlockPropertiesProps {
  block: BlockData | null;
  onUpdate: (blockId: string, properties: Record<string, any>) => void;
  onDelete: (blockId: string) => void;
}

export function BlockProperties({ block, onUpdate, onDelete }: BlockPropertiesProps) {
  if (!block) {
    return (
      <div className="border-l bg-muted/30 w-80 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-sm text-muted-foreground">
            Selecione um bloco para editar suas propriedades
          </p>
        </div>
      </div>
    );
  }

  const template = BLOCK_TEMPLATES.find((t) => t.type === block.type);
  if (!template) return null;

  const handlePropertyChange = (key: string, value: any) => {
    onUpdate(block.id, {
      ...block.properties,
      [key]: value,
    });
  };

  return (
    <div className="border-l bg-muted/30 w-80 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">{template.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Editar propriedades
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(block.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {template.editableFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.key}
                  value={block.properties[field.key] || ''}
                  onChange={(e) => handlePropertyChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-sm"
                  rows={3}
                />
              ) : field.type === 'color' ? (
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id={field.key}
                    value={block.properties[field.key] || '#000000'}
                    onChange={(e) => handlePropertyChange(field.key, e.target.value)}
                    className="h-9 w-16 p-1"
                  />
                  <Input
                    type="text"
                    value={block.properties[field.key] || ''}
                    onChange={(e) => handlePropertyChange(field.key, e.target.value)}
                    placeholder="#000000"
                    className="flex-1 text-sm"
                  />
                </div>
              ) : (
                <Input
                  type={field.type === 'url' ? 'url' : 'text'}
                  id={field.key}
                  value={block.properties[field.key] || ''}
                  onChange={(e) => handlePropertyChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
