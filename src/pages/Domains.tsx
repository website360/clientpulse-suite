import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DomainTable } from '@/components/domains/DomainTable';
import { DomainFormModal } from '@/components/domains/DomainFormModal';

export default function Domains() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsModalOpen(false);
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

        <DomainTable key={refreshTrigger} onEdit={() => setRefreshTrigger(prev => prev + 1)} />

        <DomainFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
