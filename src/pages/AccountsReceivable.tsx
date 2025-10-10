import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceivableStats } from '@/components/financial/receivable/ReceivableStats';
import { ReceivableFilters } from '@/components/financial/receivable/ReceivableFilters';
import { ReceivableTable } from '@/components/financial/receivable/ReceivableTable';
import { ReceivableFormModal } from '@/components/financial/receivable/ReceivableFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountsReceivable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
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

        <Tabs defaultValue="receivable" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payable" onClick={() => navigate('/financeiro/pagar')}>
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
          </TabsList>

          <TabsContent value="receivable" className="space-y-6">
            <ReceivableStats filters={filters} />
            
            <div className="flex items-center justify-between gap-4">
              <ReceivableFilters filters={filters} onFiltersChange={setFilters} />
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Receber
              </Button>
            </div>

            <ReceivableTable filters={filters} />
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
