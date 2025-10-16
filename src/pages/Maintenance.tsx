import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { MaintenanceHistory } from "@/components/maintenance/MaintenanceHistory";
import { MaintenanceFilters } from "@/components/maintenance/MaintenanceFilters";
import { MaintenanceCards } from "@/components/maintenance/MaintenanceCards";
import { MaintenanceTable } from "@/components/maintenance/MaintenanceTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Maintenance() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  const { data: plans, isLoading } = useQuery({
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
            nickname
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredPlans = plans?.filter((plan) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const clientName = (plan.clients?.nickname || plan.clients?.company_name || plan.clients?.full_name || '').toLowerCase();
      const domain = (plan.domains?.domain || '').toLowerCase();
      
      if (!clientName.includes(searchLower) && !domain.includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      const lastExecution = plan.maintenance_executions?.[0];
      
      if (filters.status === 'active' && !plan.is_active) return false;
      if (filters.status === 'inactive' && plan.is_active) return false;
      
      if (filters.status === 'pending' || filters.status === 'urgent') {
        if (!lastExecution && filters.status === 'urgent') return true;
        if (!lastExecution) return false;
        
        const daysSince = Math.floor((new Date().getTime() - new Date(lastExecution.executed_at).getTime()) / (1000 * 60 * 60 * 24));
        
        if (filters.status === 'pending' && (daysSince >= 25 && daysSince < 35)) return true;
        if (filters.status === 'urgent' && daysSince >= 35) return true;
        
        return false;
      }
    }

    return true;
  }) || [];

  const handleExecute = (plan: any) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
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
            ) : viewMode === 'table' ? (
              <MaintenanceTable plans={filteredPlans} onExecute={handleExecute} />
            ) : (
              <MaintenanceCards plans={filteredPlans} onExecute={handleExecute} />
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
      </div>
    </DashboardLayout>
  );
}
