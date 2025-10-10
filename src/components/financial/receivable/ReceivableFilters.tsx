import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReceivableFiltersProps {
  filters: {
    status: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ReceivableFilters({ filters, onFiltersChange }: ReceivableFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(filters.dateFrom || new Date());
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    const firstDay = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    onFiltersChange({
      ...filters,
      dateFrom: formatDate(firstDay),
      dateTo: formatDate(lastDay)
    });
  };

  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
          <SelectItem value="received">Recebido</SelectItem>
          <SelectItem value="overdue">Vencido</SelectItem>
          <SelectItem value="canceled">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Categorias</SelectItem>
          <SelectItem value="Serviços">Serviços</SelectItem>
          <SelectItem value="Produtos">Produtos</SelectItem>
          <SelectItem value="Mensalidades">Mensalidades</SelectItem>
          <SelectItem value="Consultoria">Consultoria</SelectItem>
          <SelectItem value="Outros">Outros</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => changeMonth('prev')}
          title="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          className="w-[150px]"
          placeholder="Data inicial"
        />

        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          className="w-[150px]"
          placeholder="Data final"
        />
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => changeMonth('next')}
          title="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
