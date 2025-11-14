import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast as sonnerToast } from 'sonner';
import { useEnsureClientLinked } from '@/hooks/useEnsureClientLinked';

interface Contract {
  id: string;
  service_id: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
}

export default function ClientContracts() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const { clientId, isLoading: clientLoading, error: clientError, isContact } = useEnsureClientLinked();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bloquear acesso para contatos
    if (isContact) {
      toast({ 
        title: 'Acesso negado', 
        description: 'Página indisponível para contatos.', 
        variant: 'destructive' 
      });
      window.location.href = '/portal';
      return;
    }

    // Aguardar o clientId estar disponível
    if (!clientLoading && clientId) {
      fetchContracts();
    } else if (!clientLoading && clientError) {
      toast({
        title: 'Erro',
        description: clientError,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, [clientId, clientLoading, clientError, isContact]);

  async function fetchContracts() {
    if (!clientId) return;

    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*, services(name), payment_methods(name), attachment_url')
        .eq('client_id', clientId)
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
  }

  const getStatusBadge = (contract: any) => {
    const { status, end_date } = contract;
    
    // Apenas recalcular status baseado na data se o status for 'active'
    // Status definidos manualmente prevalecem
    let displayStatus = status;
    
    if (status === 'active' && end_date) {
      const endDate = new Date(end_date);
      endDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        displayStatus = 'expired';
      } else if (daysUntilExpiry <= 30) {
        displayStatus = 'expiring';
      }
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending_signature: 'secondary',
      active: 'default',
      expiring: 'outline',
      expired: 'destructive',
      completed: 'secondary',
    };

    const labels: Record<string, string> = {
      pending_signature: 'Assinatura',
      active: 'Ativo',
      expiring: 'A Vencer',
      expired: 'Vencido',
      completed: 'Concluído',
    };

    return (
      <Badge 
        variant={variants[displayStatus] || 'default'}
        className={displayStatus === 'expiring' ? 'border-warning text-warning' : ''}
      >
        {labels[displayStatus] || displayStatus}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const downloadAttachment = async (url: string) => {
    const { data, error } = await supabase.storage
      .from('contract-attachments')
      .download(url);

    if (error) {
      sonnerToast.error('Erro ao baixar anexo');
      return;
    }

    const blob = new Blob([data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = url.split('/').pop() || 'contrato';
    link.click();
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

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Meio de Pagamento</TableHead>
                <TableHead>Condições</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{(contract as any).services.name}</TableCell>
                    <TableCell>{formatCurrency(Number(contract.amount))}</TableCell>
                    <TableCell>{(contract as any).payment_methods?.name || '-'}</TableCell>
                    <TableCell>{(contract as any).payment_terms || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(parse(contract.start_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {contract.end_date
                          ? format(parse(contract.end_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Indeterminado'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(contract as any).attachment_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadAttachment((contract as any).attachment_url)}
                            title="Baixar anexo"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
