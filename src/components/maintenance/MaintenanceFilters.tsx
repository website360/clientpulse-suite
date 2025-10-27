import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MaintenanceFiltersProps {
  filters: {
    search: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function MaintenanceFilters({ filters, onFiltersChange }: MaintenanceFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="search" className="mb-2 block">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Buscar por cliente ou domínio..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-[180px]">
        <Label htmlFor="status" className="mb-2 block">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="done">Realizadas</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
