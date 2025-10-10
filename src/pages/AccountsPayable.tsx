import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayableStats } from '@/components/financial/payable/PayableStats';
import { PayableFilters } from '@/components/financial/payable/PayableFilters';
import { PayableTable } from '@/components/financial/payable/PayableTable';
import { PayableFormModal } from '@/components/financial/payable/PayableFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountsPayable = () => {
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
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie contas a pagar e receber</p>
          </div>
        </div>

        <Tabs defaultValue="payable" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
            <TabsTrigger value="receivable" onClick={() => navigate('/financeiro/receber')}>
              Contas a Receber
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payable" className="space-y-6">
            <PayableStats filters={filters} />
            
            <div className="flex items-center justify-between gap-4">
              <PayableFilters filters={filters} onFiltersChange={setFilters} />
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            </div>

            <PayableTable filters={filters} />
          </TabsContent>
        </Tabs>

        <PayableFormModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default AccountsPayable;
