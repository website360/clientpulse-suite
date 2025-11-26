import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Globe } from 'lucide-react';
import { DomainTable } from '@/components/domains/DomainTable';
import { DomainFormModal } from '@/components/domains/DomainFormModal';
import { DomainFilters } from '@/components/domains/DomainFilters';
import { TablePagination } from '@/components/ui/table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyDomains } from '@/components/illustrations/EmptyDomains';
import { supabase } from '@/integrations/supabase/client';

export default function Domains() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    search: '',
    owner: 'all',
  });

  useEffect(() => {
    fetchCount();
  }, [filters]);

  const fetchCount = async () => {
    let query = supabase
      .from('domains')
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters.search) {
      query = query.ilike('domain', `%${filters.search}%`);
    }
    if (filters.owner !== 'all') {
      query = query.eq('owner', filters.owner as 'agency' | 'client');
    }

    const { count } = await query;
    setTotalCount(count || 0);
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsModalOpen(false);
    fetchCount();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout breadcrumbLabel="Domínios">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Domínios</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os domínios dos seus clientes
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Domínio
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Lista de Domínios</CardTitle>
            </div>
            <DomainFilters filters={filters} onFiltersChange={setFilters} />
          </CardHeader>
          <CardContent className="p-0">
            {totalCount === 0 ? (
              <EmptyState
                icon={Globe}
                title="Nenhum domínio cadastrado"
                description="Adicione domínios dos seus clientes para gerenciar renovações e evitar expirações."
                illustration={<EmptyDomains />}
                action={{
                  label: "Novo Domínio",
                  onClick: () => setIsModalOpen(true)
                }}
              />
            ) : (
              <>
                <DomainTable 
                  key={refreshTrigger} 
                  onEdit={() => {
                    setRefreshTrigger(prev => prev + 1);
                    fetchCount();
                  }}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filters={filters}
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
                    setRefreshTrigger(prev => prev + 1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        <DomainFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
