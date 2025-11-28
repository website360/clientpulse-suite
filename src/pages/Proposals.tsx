import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposalTable } from '@/components/proposals/ProposalTable';
import { ProposalFilters } from '@/components/proposals/ProposalFilters';
import { ProposalFormModal } from '@/components/proposals/ProposalFormModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Proposals() {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  const { data: proposals = [], isLoading, refetch } = useQuery({
    queryKey: ['proposals', filters],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          clients (
            company_name,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const handleView = (proposal: any) => {
    // TODO: Implement view modal
    console.log('View proposal:', proposal);
  };

  const handleEdit = (proposal: any) => {
    // TODO: Implement edit modal
    console.log('Edit proposal:', proposal);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return;

    const { error } = await supabase.from('proposals').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir proposta');
      return;
    }

    toast.success('Proposta excluída com sucesso');
    refetch();
  };

  const handleSend = async (proposal: any) => {
    // TODO: Implement send functionality
    console.log('Send proposal:', proposal);
    toast.info('Funcionalidade de envio em desenvolvimento');
  };

  const handleDownload = async (proposal: any) => {
    // TODO: Implement PDF download
    console.log('Download proposal:', proposal);
    toast.info('Funcionalidade de download em desenvolvimento');
  };

  const [showFormModal, setShowFormModal] = useState(false);

  const handleNew = () => {
    setShowFormModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">
            Gerencie suas propostas comerciais
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <ProposalFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <ProposalTable
          proposals={proposals}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSend={handleSend}
          onDownload={handleDownload}
        />
      )}

      <ProposalFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
