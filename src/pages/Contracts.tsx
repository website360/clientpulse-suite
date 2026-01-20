import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { ContractTable } from '@/components/contracts/ContractTable';
import { ContractFilters } from '@/components/contracts/ContractFilters';
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
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  useEffect(() => {
    fetchContracts();
  }, [currentPage, pageSize, sortColumn, sortDirection, filters]);

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
    // Build count query
    let countQuery = supabase
      .from('contracts')
      .select('*, clients(full_name, company_name, responsible_name), services(name)', { count: 'exact', head: true });

    // Apply status filter to count
    if (filters.status === 'active') {
      countQuery = countQuery.eq('status', 'active');
    } else if (filters.status === 'expired') {
      countQuery = countQuery.lt('end_date', new Date().toISOString().split('T')[0]);
    } else if (filters.status === 'expiring_soon') {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      countQuery = countQuery
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    const { count } = await countQuery;
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

    // Apply status filter
    if (filters.status === 'active') {
      query = query.eq('status', 'active');
    } else if (filters.status === 'expired') {
      query = query.lt('end_date', new Date().toISOString().split('T')[0]);
    } else if (filters.status === 'expiring_soon') {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      query = query
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    // Apply sorting
    if (sortColumn) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (!error && data) {
      // Apply search filter client-side
      let filteredData = data;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = data.filter((contract: any) => {
          const clientName = contract.clients?.full_name || contract.clients?.company_name || contract.clients?.responsible_name || '';
          const serviceName = contract.services?.name || '';
          return clientName.toLowerCase().includes(searchLower) || serviceName.toLowerCase().includes(searchLower);
        });
      }
      setContracts(filteredData);
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

        {contracts.length === 0 ? (
          <Card>
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
          </Card>
        ) : (
          <div className="space-y-4">
            <ContractFilters filters={filters} onFiltersChange={setFilters} />
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
          </div>
        )}

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
