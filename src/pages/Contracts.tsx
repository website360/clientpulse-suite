import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { ContractTable } from '@/components/contracts/ContractTable';
import { supabase } from '@/integrations/supabase/client';

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        clients (
          full_name,
          company_name
        ),
        services (
          name
        ),
        payment_methods (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContracts(data);
    }
  };

  const handleEdit = (contract: any) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedContract(null);
  };

  const handleSuccess = () => {
    fetchContracts();
    handleCloseForm();
  };

  return (
    <DashboardLayout breadcrumbLabel="Contratos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Contratos</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractTable
              contracts={contracts}
              onEdit={handleEdit}
              onRefresh={fetchContracts}
            />
          </CardContent>
        </Card>

        <ContractFormModal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          contract={selectedContract}
        />
      </div>
    </DashboardLayout>
  );
}
