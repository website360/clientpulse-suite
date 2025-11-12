import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Geral',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Abrir busca global' },
      { keys: ['Ctrl', '?'], description: 'Ver atalhos' },
      { keys: ['Esc'], description: 'Fechar modais' },
    ],
  },
  {
    category: 'Navegação',
    items: [
      { keys: ['Ctrl', 'D'], description: 'Ir para Dashboard' },
      { keys: ['Ctrl', 'T'], description: 'Ir para Tickets' },
      { keys: ['Ctrl', 'L'], description: 'Ir para Clientes' },
    ],
  },
  {
    category: 'Ações Rápidas',
    items: [
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Novo Ticket' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Novo Cliente' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Novo Projeto' },
    ],
  },
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estes atalhos para navegar mais rápido pela aplicação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key) => (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="font-mono text-xs px-2"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
