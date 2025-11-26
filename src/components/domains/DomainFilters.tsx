import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DomainFiltersProps {
  filters: {
    search: string;
    owner: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function DomainFilters({ filters, onFiltersChange }: DomainFiltersProps) {
  return (
    <div className="flex items-center gap-4 flex-1 max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por domínio..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.owner}
        onValueChange={(value) => onFiltersChange({ ...filters, owner: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Proprietário" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="agency">Agência</SelectItem>
          <SelectItem value="client">Cliente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
