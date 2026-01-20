import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AsaasReconciliation() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [asaasEnabled, setAsaasEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAsaasSettings();
  }, []);

  useEffect(() => {
    if (asaasEnabled) {
      fetchAccounts();
    }
  }, [asaasEnabled]);

  const fetchAsaasSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('asaas_settings')
        .select('is_active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setAsaasEnabled(data?.is_active ?? false);
    } catch (error) {
      console.error('Error fetching Asaas settings:', error);
      setAsaasEnabled(false);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          client:clients(full_name, company_name)
        `)
        .not('asaas_payment_id', 'is', null)
        .order('due_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-asaas-payment', {
        body: { receivableId: accountId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Status sincronizado com Asaas',
        });
        fetchAccounts();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const account of accounts) {
      try {
        const { data, error } = await supabase.functions.invoke('sync-asaas-payment', {
          body: { receivableId: account.id },
        });

        if (error) throw error;
        if (data.success) successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast({
      title: 'Sincronização concluída',
      description: `${successCount} sincronizadas com sucesso, ${errorCount} erros.`,
    });
    
    fetchAccounts();
    setSyncingAll(false);
  };

  const getAsaasStatusBadge = (status: string) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'PENDING': { label: 'Pendente', variant: 'secondary' },
      'RECEIVED': { label: 'Recebido', variant: 'default' },
      'CONFIRMED': { label: 'Confirmado', variant: 'default' },
      'OVERDUE': { label: 'Vencido', variant: 'destructive' },
    };
    const config = labels[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'received') {
      return <Badge variant="default" className="bg-success">Recebido</Badge>;
    }
    if (status === 'canceled') {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>;
  };

  const isStatusMismatch = (localStatus: string, asaasStatus: string) => {
    if (localStatus === 'received' && (asaasStatus === 'RECEIVED' || asaasStatus === 'CONFIRMED')) {
      return false;
    }
    if (localStatus === 'pending' && asaasStatus === 'PENDING') {
      return false;
    }
    if (localStatus === 'overdue' && asaasStatus === 'OVERDUE') {
      return false;
    }
    return true;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!asaasEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliação Asaas</CardTitle>
          <CardDescription>
            A integração com Asaas não está ativa. Configure nas configurações do sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Reconciliação Asaas</CardTitle>
              <CardDescription>
                Sincronize e reconcilie cobranças com o Asaas
              </CardDescription>
            </div>
            <Button 
              onClick={handleSyncAll} 
              disabled={syncingAll || accounts.length === 0}
            >
              {syncingAll ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status Local</TableHead>
                  <TableHead>Status Asaas</TableHead>
                  <TableHead>ID Asaas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma cobrança sincronizada com Asaas
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.client?.company_name || account.client?.full_name}
                      </TableCell>
                      <TableCell>{account.description}</TableCell>
                      <TableCell>{formatCurrency(account.amount)}</TableCell>
                      <TableCell>
                        {(() => {
                          const [y, m, d] = account.due_date.split('-');
                          return `${d}/${m}/${y}`;
                        })()}
                      </TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAsaasStatusBadge(account.asaas_status)}
                          {isStatusMismatch(account.status, account.asaas_status) && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {account.asaas_payment_id?.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(account.id)}
                            disabled={syncing === account.id}
                          >
                            {syncing === account.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          {account.asaas_invoice_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(account.asaas_invoice_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {accounts.some(acc => isStatusMismatch(acc.status, acc.asaas_status)) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Divergências Encontradas
            </CardTitle>
            <CardDescription>
              Existem cobranças com status divergente entre o sistema e o Asaas. 
              Sincronize para atualizar os dados.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
