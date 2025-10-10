import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface TicketFiltersProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    department: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setDepartments(data || []);
  };

  return (
    <>
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, assunto, cliente..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[180px] shrink-0">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="open">Aberto</SelectItem>
          <SelectItem value="in_progress">Em Andamento</SelectItem>
          <SelectItem value="waiting">Aguardando</SelectItem>
          <SelectItem value="resolved">Resolvido</SelectItem>
          <SelectItem value="closed">Fechado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.department}
        onValueChange={(value) => onFiltersChange({ ...filters, department: value })}
      >
        <SelectTrigger className="w-[180px] shrink-0">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Departamentos</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
      >
        <SelectTrigger className="w-[180px] shrink-0">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Prioridades</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}
