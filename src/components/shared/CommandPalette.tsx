import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Ticket,
  Users,
  FolderKanban,
  FileText,
  Settings,
  DollarSign,
  Calendar,
  StickyNote,
  Plus,
  Search,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  const pages = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/'),
      keywords: ['home', 'inicio', 'dashboard'],
    },
    {
      label: 'Tickets',
      icon: Ticket,
      action: () => navigate('/tickets'),
      keywords: ['chamados', 'atendimento', 'suporte'],
    },
    {
      label: 'Clientes',
      icon: Users,
      action: () => navigate('/clients'),
      keywords: ['empresas', 'contatos'],
    },
    {
      label: 'Projetos',
      icon: FolderKanban,
      action: () => navigate('/projects'),
      keywords: ['obras', 'trabalhos'],
    },
    {
      label: 'Contratos',
      icon: FileText,
      action: () => navigate('/contracts'),
      keywords: ['acordos'],
    },
    {
      label: 'Domínios',
      icon: Search,
      action: () => navigate('/domains'),
      keywords: ['sites', 'urls'],
    },
    {
      label: 'Manutenções',
      icon: Calendar,
      action: () => navigate('/maintenance'),
      keywords: ['manutencao'],
    },
    {
      label: 'Tarefas',
      icon: StickyNote,
      action: () => navigate('/tasks'),
      keywords: ['afazeres', 'todo'],
    },
    {
      label: 'Contas a Receber',
      icon: DollarSign,
      action: () => navigate('/accounts-receivable'),
      keywords: ['financeiro', 'cobranças', 'faturas'],
    },
    {
      label: 'Contas a Pagar',
      icon: DollarSign,
      action: () => navigate('/accounts-payable'),
      keywords: ['financeiro', 'despesas', 'pagamentos'],
    },
    {
      label: 'Configurações',
      icon: Settings,
      action: () => navigate('/settings'),
      keywords: ['ajustes', 'opcoes'],
    },
  ];

  const actions = [
    {
      label: 'Novo Ticket',
      icon: Plus,
      action: () => {
        navigate('/tickets');
        setTimeout(() => {
          const newButton = document.querySelector<HTMLButtonElement>('[data-new-ticket]');
          newButton?.click();
        }, 100);
      },
      keywords: ['criar', 'adicionar', 'chamado'],
    },
    {
      label: 'Novo Cliente',
      icon: Plus,
      action: () => {
        navigate('/clients');
        setTimeout(() => {
          const newButton = document.querySelector<HTMLButtonElement>('[data-new-client]');
          newButton?.click();
        }, 100);
      },
      keywords: ['criar', 'adicionar', 'empresa'],
    },
    {
      label: 'Novo Projeto',
      icon: Plus,
      action: () => {
        navigate('/projects');
        setTimeout(() => {
          const newButton = document.querySelector<HTMLButtonElement>('[data-new-project]');
          newButton?.click();
        }, 100);
      },
      keywords: ['criar', 'adicionar'],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Digite um comando ou pesquise..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegação">
          {pages.map((page) => (
            <CommandItem
              key={page.label}
              onSelect={() => handleSelect(page.action)}
              keywords={page.keywords}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações Rápidas">
          {actions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => handleSelect(action.action)}
              keywords={action.keywords}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
