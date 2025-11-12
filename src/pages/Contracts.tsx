import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { ContractTable } from '@/components/contracts/ContractTable';
import { TablePagination } from '@/components/ui/table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyContracts } from '@/components/illustrations/EmptyContracts';
import { supabase } from '@/integrations/supabase/client';

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchContracts();
  }, [currentPage, pageSize, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const fetchContracts = async () => {
    // Count total
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);

    // Fetch paginated data
    let query = supabase
      .from('contracts')
      .select(`
        *,
        clients (
          full_name,
          company_name,
          responsible_name,
          client_type
        ),
        services (
          name
        ),
        payment_methods (
          name
        )
      `);

    // Apply sorting
    if (sortColumn) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    } else {
      // Default: order by client name alphabetically
      query = query.order('clients(full_name)', { ascending: true, nullsFirst: false });
    }

    // Apply pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

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
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum contrato cadastrado"
                description="Comece criando seu primeiro contrato para gerenciar os serviços prestados aos clientes."
                illustration={<EmptyContracts />}
                action={{
                  label: "Novo Contrato",
                  onClick: () => setIsFormOpen(true)
                }}
              />
            ) : (
              <>
                <ContractTable
                  contracts={contracts}
                  onEdit={handleEdit}
                  onRefresh={fetchContracts}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
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
              </>
            )}
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
