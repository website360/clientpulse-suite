import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Table as TableIcon, Wrench } from "lucide-react";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { MaintenancePlanFormModal } from "@/components/maintenance/MaintenancePlanFormModal";
import { MaintenanceHistory } from "@/components/maintenance/MaintenanceHistory";
import { MaintenanceFilters } from "@/components/maintenance/MaintenanceFilters";
import { MaintenanceCards } from "@/components/maintenance/MaintenanceCards";
import { MaintenanceTable } from "@/components/maintenance/MaintenanceTable";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMaintenance } from "@/components/illustrations/EmptyMaintenance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaginationSort } from "@/hooks/usePaginationSort";
import { useClientPagination } from "@/hooks/useClientPagination";

// Helper para calcular próxima data agendada
const calculateNextScheduledDate = (plan: any) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const targetDay = plan.monthly_day;
  
  const lastExecution = plan.maintenance_executions?.[0];
  
  if (lastExecution) {
    const lastDate = new Date(lastExecution.executed_at);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();
    
    if (lastMonth === currentMonth && lastYear === currentYear) {
      return new Date(currentYear, currentMonth + 1, targetDay);
    }
  }
  
  if (!lastExecution && plan.start_date) {
    const startDate = new Date(plan.start_date);
    if (startDate > today) {
      return startDate;
    }
  }
  
  return new Date(currentYear, currentMonth, targetDay);
};

export default function Maintenance() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  const {
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
  } = usePaginationSort('clients.full_name', 'asc');

  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_maintenance_plans')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            responsible_name,
            client_type
          ),
          domains (
            id,
            domain
          ),
          maintenance_executions (
            id,
            executed_at,
            next_scheduled_date
          )
        `)
        .eq('is_active', true)
        .order('full_name', { foreignTable: 'clients', ascending: true, nullsFirst: false })
        .order('executed_at', { foreignTable: 'maintenance_executions', ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredPlans = useMemo(() => {
    return plans?.filter((plan) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const clientName = (plan.clients?.responsible_name || (plan.clients?.client_type === 'company' ? plan.clients?.company_name : plan.clients?.full_name) || '').toLowerCase();
        const domain = (plan.domains?.domain || '').toLowerCase();
        
        if (!clientName.includes(searchLower) && !domain.includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        const lastExecution = plan.maintenance_executions?.[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (filters.status === 'active' && !plan.is_active) return false;
        if (filters.status === 'inactive' && plan.is_active) return false;
        
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const nextScheduledDate = calculateNextScheduledDate(plan);
        nextScheduledDate.setHours(0, 0, 0, 0);
        
        if (filters.status === 'done') {
          // Executada neste mês
          if (!lastExecution) return false;
          const lastDate = new Date(lastExecution.executed_at);
          return lastDate.getMonth() === currentMonth && lastDate.getFullYear() === currentYear;
        }
        
        if (filters.status === 'pending') {
          // Aguardando (não atrasada e não realizada neste mês)
          if (lastExecution) {
            const lastDate = new Date(lastExecution.executed_at);
            if (lastDate.getMonth() === currentMonth && lastDate.getFullYear() === currentYear) {
              return false; // Já foi realizada
            }
          }
          return today <= nextScheduledDate;
        }
        
        if (filters.status === 'overdue') {
          // Atrasadas
          if (lastExecution) {
            const lastDate = new Date(lastExecution.executed_at);
            if (lastDate.getMonth() === currentMonth && lastDate.getFullYear() === currentYear) {
              return false; // Foi realizada neste mês
            }
          }
          return today > nextScheduledDate;
        }
      }

      return true;
    }) || [];
  }, [plans, filters]);

  const sortedPlans = useMemo(() => {
    if (!sortColumn) return filteredPlans;

    return [...filteredPlans].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortColumn === 'clients.full_name') {
        aValue = a.clients?.responsible_name || (a.clients?.client_type === 'company' ? a.clients?.company_name : a.clients?.full_name) || '';
        bValue = b.clients?.responsible_name || (b.clients?.client_type === 'company' ? b.clients?.company_name : b.clients?.full_name) || '';
      } else if (sortColumn === 'domains.domain') {
        aValue = a.domains?.domain || '';
        bValue = b.domains?.domain || '';
      } else if (sortColumn === 'last_execution') {
        aValue = a.maintenance_executions?.[0]?.executed_at || '';
        bValue = b.maintenance_executions?.[0]?.executed_at || '';
      } else if (sortColumn === 'next_scheduled') {
        const aLast = a.maintenance_executions?.[0];
        const bLast = b.maintenance_executions?.[0];
        aValue = aLast?.next_scheduled_date || '';
        bValue = bLast?.next_scheduled_date || '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' })
          : bValue.localeCompare(aValue, 'pt-BR', { sensitivity: 'base' });
      }

      return 0;
    });
  }, [filteredPlans, sortColumn, sortDirection]);

  const {
    paginatedItems: paginatedPlans,
    totalPages,
    totalItems,
  } = useClientPagination(sortedPlans, pageSize);

  const handleExecute = (plan: any) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setIsPlanFormOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manutenção Preventiva</h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento de manutenções preventivas dos clientes
            </p>
          </div>
          <Button onClick={() => setIsPlanFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Manutenção
          </Button>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans">Planos Ativos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <MaintenanceFilters filters={filters} onFiltersChange={setFilters} />
              
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando planos...</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="Nenhum plano de manutenção"
                description="Configure planos de manutenção preventiva para seus clientes e receba alertas automáticos."
                illustration={<EmptyMaintenance />}
                action={{
                  label: "Nova Manutenção",
                  onClick: () => setIsPlanFormOpen(true)
                }}
              />
            ) : viewMode === 'table' ? (
              <MaintenanceTable 
                plans={paginatedPlans} 
                onExecute={handleExecute}
                onEdit={handleEdit}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            ) : (
              <MaintenanceCards plans={sortedPlans} onExecute={handleExecute} />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <MaintenanceHistory />
          </TabsContent>
        </Tabs>

        <MaintenanceFormModal
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setSelectedPlan(null);
          }}
          selectedPlan={selectedPlan}
        />

        <MaintenancePlanFormModal
          open={isPlanFormOpen}
          onOpenChange={(open) => {
            setIsPlanFormOpen(open);
            if (!open) {
              setEditingPlan(null);
              refetch();
            }
          }}
          plan={editingPlan}
        />
      </div>
    </DashboardLayout>
  );
}
