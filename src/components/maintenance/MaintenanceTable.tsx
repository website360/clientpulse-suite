import { Play, Pencil } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        return <Badge variant="destructive">Atrasada</Badge>;
      }
      return <Badge className="bg-warning/10 text-warning border-warning/20">Aguardando Primeira Manutenção</Badge>;
    }

    const lastDate = new Date(lastExecution.executed_at);
    lastDate.setHours(0, 0, 0, 0);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Se foi executada no mês/ano atual
    if (lastMonth === currentMonth && lastYear === currentYear) {
      return <Badge className="bg-success/10 text-success border-success/20">Realizada</Badge>;
    }

    // Verificar se está atrasada
    if (today > nextScheduledDate) {
      return <Badge variant="destructive">Atrasada</Badge>;
    }

    return <Badge className="bg-warning/10 text-warning border-warning/20">Aguardando Manutenção</Badge>;
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
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                column="clients.full_name"
                label="Cliente"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="domains.domain"
                label="Domínio"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="monthly_day"
                label="Dia Execução"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="last_execution"
                label="Última Manutenção"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="next_scheduled"
                label="Próxima Manutenção"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="status"
                label="Status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const lastExecution = plan.maintenance_executions?.[0];
              const nextDate = getNextScheduledDate(plan);

              return (
                <TableRow key={plan.id}>
                  <TableCell>
                    <ClientNameCell client={plan.clients || {}} />
                  </TableCell>
                  <TableCell>
                    {plan.domains?.domain || '-'}
                  </TableCell>
                  <TableCell>
                    Dia {plan.monthly_day}
                  </TableCell>
                  <TableCell>
                    {lastExecution 
                      ? format(new Date(lastExecution.executed_at), "dd/MM/yyyy", { locale: ptBR })
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {format(nextDate, "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(plan)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(plan)}
                        className="gap-2"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {shouldShowExecuteButton(plan) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecute(plan)}
                          disabled={!plan.is_active}
                          className="gap-2"
                        >
                          <Play className="h-3 w-3" />
                          Executar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
