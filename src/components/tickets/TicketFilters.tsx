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

interface Agent {
  id: string;
  full_name: string;
}

interface TicketFiltersProps {
  filters: {
    search: string;
    priority: string;
    department: string;
    status: string;
    assignee?: string;
  };
  onFiltersChange: (filters: any) => void;
  agents?: Agent[];
  showAssignee?: boolean;
}

export function TicketFilters({ filters, onFiltersChange, agents = [], showAssignee = false }: TicketFiltersProps) {
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setDepartments(data || []);
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar tickets..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
          style={{ height: '40px' }}
        />
      </div>

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

      {showAssignee && (
        <Select
          value={filters.assignee || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, assignee: value })}
        >
          <SelectTrigger className="w-[180px] shrink-0">
            <SelectValue placeholder="Atendente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Atendentes</SelectItem>
            <SelectItem value="unassigned">Não atribuído</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
    </div>
  );
}
