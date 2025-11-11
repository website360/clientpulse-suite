import { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Macro {
  id: string;
  name: string;
  shortcut: string | null;
  content: string;
}

interface MacroSelectorProps {
  onSelectMacro: (content: string) => void;
  departmentId?: string;
}

export function MacroSelector({ onSelectMacro, departmentId }: MacroSelectorProps) {
  const [open, setOpen] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMacros();
    }
  }, [open, departmentId]);

  const fetchMacros = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ticket_macros')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (departmentId) {
        query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMacros(data || []);
    } catch (error) {
      console.error('Error fetching macros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (macro: Macro) => {
    onSelectMacro(macro.content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Macros</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar macro..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Carregando...' : 'Nenhuma macro encontrada'}
            </CommandEmpty>
            <CommandGroup heading="Respostas Rápidas">
              {macros.map((macro) => (
                <CommandItem
                  key={macro.id}
                  onSelect={() => handleSelect(macro)}
                  className="flex flex-col items-start gap-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">{macro.name}</span>
                    {macro.shortcut && (
                      <code className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        {macro.shortcut}
                      </code>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 w-full">
                    {macro.content}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}