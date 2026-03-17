import { Play, Pencil, MoreVertical, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TablePagination } from '@/components/ui/table-pagination';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceTableProps {
  plans: any[];
  onExecute: (plan: any) => void;
  onEdit: (plan: any) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function MaintenanceTable({ 
  plans, 
  onExecute,
  onEdit,
  sortColumn,
  sortDirection,
  onSort,
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: MaintenanceTableProps) {
  const getStatusBadge = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    const today = new Date();
    const nextScheduledDate = getNextScheduledDate(plan);
    
    today.setHours(0, 0, 0, 0);
    nextScheduledDate.setHours(0, 0, 0, 0);

    // Se nunca foi executada
    if (!lastExecution) {
      if (today > nextScheduledDate) {
        return (
          <Badge variant="default" className="bg-red-50 text-red-700 border-0 hover:bg-red-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
            <Circle className="h-2 w-2 fill-red-500 text-red-500" />
            Atrasada
          </Badge>
        );
      }
      return (
        <Badge variant="default" className="bg-amber-50 text-amber-700 border-0 hover:bg-amber-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
          <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
          Aguardando
        </Badge>
      );
    }

    const lastDate = new Date(lastExecution.executed_at);
    lastDate.setHours(0, 0, 0, 0);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Se foi executada no mês/ano atual
    if (lastMonth === currentMonth && lastYear === currentYear) {
      return (
        <Badge variant="default" className="bg-green-50 text-green-700 border-0 hover:bg-green-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          Realizada
        </Badge>
      );
    }

    // Verificar se está atrasada
    if (today > nextScheduledDate) {
      return (
        <Badge variant="default" className="bg-red-50 text-red-700 border-0 hover:bg-red-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
          <Circle className="h-2 w-2 fill-red-500 text-red-500" />
          Atrasada
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-amber-50 text-amber-700 border-0 hover:bg-amber-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
        <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
        Aguardando
      </Badge>
    );
  };

  const getNextScheduledDate = (plan: any) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const targetDay = plan.monthly_day;
    
    const lastExecution = plan.maintenance_executions?.[0];
    
    // Se já foi executada neste mês, próxima é mês seguinte
    if (lastExecution) {
      const lastDate = new Date(lastExecution.executed_at);
      const lastMonth = lastDate.getMonth();
      const lastYear = lastDate.getFullYear();
      
      if (lastMonth === currentMonth && lastYear === currentYear) {
        // Próxima é no mês seguinte
        return new Date(currentYear, currentMonth + 1, targetDay);
      }
    }
    
    // Se nunca foi executada, verificar start_date
    if (!lastExecution && plan.start_date) {
      const startDate = parseISO(plan.start_date);
      if (startDate > today) {
        return startDate;
      }
    }
    
    // Caso padrão: próxima é no dia configurado do mês atual
    return new Date(currentYear, currentMonth, targetDay);
  };

  const shouldShowExecuteButton = (plan: any) => {
    const lastExecution = plan.maintenance_executions?.[0];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Se já foi executada
    if (lastExecution) {
      const lastDate = new Date(lastExecution.executed_at);
      const lastMonth = lastDate.getMonth();
      const lastYear = lastDate.getFullYear();
      
      // Se foi executada no mês/ano atual, não mostrar botão
      if (lastMonth === currentMonth && lastYear === currentYear) {
        return false;
      }
    }

    // Mostrar botão se estamos no mês vigente
    return true;
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">Nenhum plano encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('clients.full_name')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente {sortColumn === 'clients.full_name' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('domains.domain')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Domínio {sortColumn === 'domains.domain' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort('monthly_day')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Dia {sortColumn === 'monthly_day' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('last_execution')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Última {sortColumn === 'last_execution' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('next_scheduled')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Próxima {sortColumn === 'next_scheduled' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('status')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
        </div>
      </div>

      {/* Plan Rows as Cards */}
      {plans.map((plan, index) => {
        const lastExecution = plan.maintenance_executions?.[0];
        const nextDate = getNextScheduledDate(plan);

        return (
          <Card 
            key={plan.id}
            className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              <div className="col-span-2">
                <ClientNameCell client={plan.clients || {}} />
              </div>
              <div className="col-span-2">
                <p className="text-[14px] text-foreground">{plan.domains?.domain || '-'}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[14px] text-foreground">Dia {plan.monthly_day}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[14px] text-muted-foreground">
                  {lastExecution 
                    ? format(new Date(lastExecution.executed_at), "dd/MM/yyyy", { locale: ptBR })
                    : '-'
                  }
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[14px] text-muted-foreground">
                  {format(nextDate, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="col-span-2 whitespace-nowrap">
                {getStatusBadge(plan)}
              </div>
              <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                    <DropdownMenuItem onClick={() => onEdit(plan)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {shouldShowExecuteButton(plan) && (
                      <DropdownMenuItem 
                        onClick={() => onExecute(plan)}
                        disabled={!plan.is_active}
                        className="rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Executar Manutenção
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        );
      })}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
