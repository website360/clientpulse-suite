import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContractFiltersProps {
  filters: {
    search: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ContractFilters({ filters, onFiltersChange }: ContractFiltersProps) {
  return (
    <div className="flex items-center gap-4 flex-1 max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, serviço..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 h-10"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[160px] h-10">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="expired">Vencidos</SelectItem>
          <SelectItem value="expiring_soon">Vencendo em Breve</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
