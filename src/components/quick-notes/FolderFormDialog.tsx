import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuickNoteFolder } from './FolderSidebar';

interface FolderFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folder: QuickNoteFolder | null;
  onSubmit: (data: { name: string; color: string; is_shared: boolean }) => Promise<void>;
}

const COLORS = [
  '#64748b', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6',
];

export function FolderFormDialog({ open, onOpenChange, folder, onSubmit }: FolderFormDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748b');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(folder?.name ?? '');
      setColor(folder?.color ?? '#64748b');
      setIsShared(folder?.is_shared ?? false);
    }
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), color, is_shared: isShared });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? 'Editar pasta' : 'Nova pasta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nome</Label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reuniões, Pessoal..."
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="folder-shared" className="text-sm">
                Compartilhar com a equipe
              </Label>
              <p className="text-xs text-muted-foreground">
                Todos da agência poderão ver e editar
              </p>
            </div>
            <Switch
              id="folder-shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
