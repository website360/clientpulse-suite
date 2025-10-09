import { useState } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Open with Cmd/Ctrl + K
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar... (Ctrl+K)"
          className="pl-9 pr-20"
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Busca Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar clientes, tickets, departamentos..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2 min-h-[200px]">
              {search ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Buscando por "{search}"...
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Digite algo para começar a busca
                </div>
              )}
            </div>

            <div className="flex gap-2 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 rounded border bg-muted">↑↓</kbd> para navegar
              <kbd className="px-2 py-1 rounded border bg-muted">Enter</kbd> para selecionar
              <kbd className="px-2 py-1 rounded border bg-muted">Esc</kbd> para fechar
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
