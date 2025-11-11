import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePreset } from '@/hooks/useDateRangeFilter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangeFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate: Date;
  endDate: Date;
}

export function DateRangeFilter({ preset, onPresetChange, startDate, endDate }: DateRangeFilterProps) {
  const presetLabels: Record<DateRangePreset, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
    last30: 'Últimos 30 dias',
    year: 'Este Ano',
    custom: 'Personalizado',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">
            {presetLabels[preset]}
          </span>
          <span className="text-xs text-muted-foreground hidden md:inline">
            ({format(startDate, 'dd/MM', { locale: ptBR })} - {format(endDate, 'dd/MM', { locale: ptBR })})
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onPresetChange('today')}>
          Hoje
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPresetChange('week')}>
          Esta Semana
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPresetChange('month')}>
          Este Mês
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPresetChange('last30')}>
          Últimos 30 dias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPresetChange('year')}>
          Este Ano
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
