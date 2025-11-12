import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import { ReceivableStats } from '@/components/financial/receivable/ReceivableStats';
import { ReceivableFilters } from '@/components/financial/receivable/ReceivableFilters';
import { ReceivableTable } from '@/components/financial/receivable/ReceivableTable';
import { ReceivableFormModal } from '@/components/financial/receivable/ReceivableFormModal';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, AlertTriangle, FileText, Users, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FinancialAnalytics } from '@/components/financial/FinancialAnalytics';
import { CashFlowProjection } from '@/components/financial/CashFlowProjection';
import { DelinquencyReport } from '@/components/financial/DelinquencyReport';
import { DREReport } from '@/components/financial/DREReport';
import { ClientProfitability } from '@/components/financial/ClientProfitability';
import { AsaasReconciliation } from '@/components/financial/AsaasReconciliation';

const AccountsReceivable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get first and last day of current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    dateFrom: formatDate(firstDay),
    dateTo: formatDate(lastDay),
    search: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const navigate = useNavigate();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie contas a pagar e receber</p>
          </div>
        </div>

        <Tabs defaultValue="receivable" className="space-y-6">
          <ScrollableTabs>
            <TabsList>
              <TabsTrigger value="payable" onClick={() => navigate('/financeiro/pagar')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Contas a Pagar
              </TabsTrigger>
              <TabsTrigger value="receivable">
                <BarChart3 className="h-4 w-4 mr-2" />
                Contas a Receber
              </TabsTrigger>
              <TabsTrigger value="cashflow">
                <TrendingUp className="h-4 w-4 mr-2" />
                Fluxo de Caixa
              </TabsTrigger>
              <TabsTrigger value="delinquency">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Inadimplência
              </TabsTrigger>
              <TabsTrigger value="dre">
                <FileText className="h-4 w-4 mr-2" />
                DRE
              </TabsTrigger>
              <TabsTrigger value="profitability">
                <Users className="h-4 w-4 mr-2" />
                Lucratividade
              </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="asaas">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reconciliação Asaas
                </TabsTrigger>
              </TabsList>
            </ScrollableTabs>

          <TabsContent value="receivable" className="space-y-6">
            <ReceivableStats filters={filters} />
            
            <div className="flex items-center justify-between gap-4">
              <ReceivableFilters filters={filters} onFiltersChange={setFilters} />
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Receber
              </Button>
            </div>

            <div className="border rounded-lg">
              <ReceivableTable 
                filters={filters}
                currentPage={currentPage}
                pageSize={pageSize}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                onTotalCountChange={setTotalCount}
              />
              <TablePagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <CashFlowProjection />
          </TabsContent>

          <TabsContent value="delinquency" className="space-y-6">
            <DelinquencyReport />
          </TabsContent>

          <TabsContent value="dre" className="space-y-6">
            <DREReport />
          </TabsContent>

          <TabsContent value="profitability" className="space-y-6">
            <ClientProfitability />
          </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <FinancialAnalytics />
            </TabsContent>

            <TabsContent value="asaas" className="space-y-6">
              <AsaasReconciliation />
            </TabsContent>
          </Tabs>

        <ReceivableFormModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default AccountsReceivable;
