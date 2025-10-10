import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface Contract {
  id: string;
  service_id: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
}

export default function ClientContracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!client) {
        toast({
          title: 'Erro',
          description: 'Cliente não encontrado',
          variant: 'destructive',
        });
        return;
      }

      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*, services(name)')
        .eq('client_id', client.id)
        .order('start_date', { ascending: false });

      if (contractsError) throw contractsError;
      setContracts(contractsData || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contratos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      pending: 'secondary',
      expired: 'destructive',
    };
    const labels: Record<string, string> = {
      active: 'Ativo',
      pending: 'Pendente',
      expired: 'Expirado',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbLabel="Contratos">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel="Contratos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Visualize seus contratos ativos
          </p>
        </div>

        <div className="grid gap-4">
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum contrato encontrado
              </CardContent>
            </Card>
          ) : (
            contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle>{(contract as any).services?.name || 'Serviço'}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(contract.start_date).toLocaleDateString('pt-BR')} - {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    R$ {contract.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
