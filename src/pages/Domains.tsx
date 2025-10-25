import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { DomainTable } from '@/components/domains/DomainTable';
import { DomainFormModal } from '@/components/domains/DomainFormModal';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';

export default function Domains() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCount();
  }, []);

  const fetchCount = async () => {
    const { count } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true });
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
            <CardTitle>Lista de Domínios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
