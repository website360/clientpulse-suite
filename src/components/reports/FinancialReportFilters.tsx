import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialReportFilters as Filters } from '@/pages/Reports';
import { Badge } from '@/components/ui/badge';

interface FinancialReportFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

export default function FinancialReportFilters({ filters, setFilters }: FinancialReportFiltersProps) {
  const { data: categories } = useQuery({
    queryKey: ['payment-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, nickname, company_name')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const statusOptions = filters.reportType === 'receivable'
    ? [
      { value: 'pending', label: 'Pendente' },
      { value: 'received', label: 'Recebido' },
      { value: 'overdue', label: 'Vencido' },
      { value: 'canceled', label: 'Cancelado' },
    ]
    : [
      { value: 'pending', label: 'Pendente' },
      { value: 'paid', label: 'Pago' },
      { value: 'overdue', label: 'Vencido' },
      { value: 'canceled', label: 'Cancelado' },
    ];
  const handleStatusToggle = (status: string) => {
    const currentStatus = filters.status.includes(status as any);
    if (currentStatus) {
      setFilters({
        ...filters,
        status: filters.status.filter((s) => s !== status),
      });
    } else {
      setFilters({
        ...filters,
        status: [...filters.status, status as any],
      });
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategory = filters.categories.includes(categoryId);
    if (currentCategory) {
      setFilters({
        ...filters,
        categories: filters.categories.filter((c) => c !== categoryId),
      });
    } else {
      setFilters({
        ...filters,
        categories: [...filters.categories, categoryId],
      });
    }
  };

  const handlePaymentMethodToggle = (methodId: string) => {
    const currentMethod = filters.paymentMethods.includes(methodId);
    if (currentMethod) {
      setFilters({
        ...filters,
        paymentMethods: filters.paymentMethods.filter((m) => m !== methodId),
      });
    } else {
      setFilters({
        ...filters,
        paymentMethods: [...filters.paymentMethods, methodId],
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      reportType: '',
      status: [],
      categories: [],
      startDate: undefined,
      endDate: undefined,
      paymentMethods: [],
      clientId: 'all',
      supplierId: 'all',
    });
  };

  return (
    <div className="space-y-6 p-6 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" />
          Limpar Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tipo de Relatório */}
        <div className="space-y-2">
          <Label>Tipo de Conta</Label>
          <Select
            value={filters.reportType}
            onValueChange={(value) => setFilters({ ...filters, reportType: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payable">Contas a Pagar</SelectItem>
              <SelectItem value="receivable">Contas a Receber</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        {filters.reportType === 'receivable' && (
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nickname || client.company_name || client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fornecedor */}
        {filters.reportType === 'payable' && (
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Select value={filters.supplierId} onValueChange={(value) => setFilters({ ...filters, supplierId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data Inicial */}
        <div className="space-y-2">
          <Label>Data Inicial</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !filters.startDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => setFilters({ ...filters, startDate: date })}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Data Final */}
        <div className="space-y-2">
          <Label>Data Final</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !filters.endDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => setFilters({ ...filters, endDate: date })}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <Badge
              key={status.value}
              variant={filters.status.includes(status.value as any) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleStatusToggle(status.value)}
            >
              {status.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <div className="space-y-2">
        <Label>Categorias</Label>
        <div className="flex flex-wrap gap-2">
          {categories
            ?.filter((cat) => cat.type === filters.reportType)
            .map((category) => (
              <Badge
                key={category.id}
                variant={filters.categories.includes(category.name) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category.name)}
              >
                {category.name}
              </Badge>
            ))}
        </div>
      </div>

      {/* Formas de Pagamento */}
      <div className="space-y-2">
        <Label>Formas de Pagamento</Label>
        <div className="flex flex-wrap gap-2">
          {paymentMethods?.map((method) => (
            <Badge
              key={method.id}
              variant={filters.paymentMethods.includes(method.name) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handlePaymentMethodToggle(method.name)}
            >
              {method.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
