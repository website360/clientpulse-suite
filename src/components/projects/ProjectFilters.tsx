import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProjectFiltersProps {
  filters: {
    client: string;
    type: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ProjectFilters({ filters, onFiltersChange }: ProjectFiltersProps) {
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, company_name, nickname')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select value={filters.client} onValueChange={(value) => onFiltersChange({ ...filters, client: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os clientes</SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.nickname || client.company_name || client.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={filters.type} onValueChange={(value) => onFiltersChange({ ...filters, type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            {projectTypes?.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            <SelectItem value="planejamento">Planejamento</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
