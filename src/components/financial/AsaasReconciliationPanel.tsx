import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, ExternalLink, Search, Link2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';
import {
  classifyCharges,
  type AsaasCharge,
  type MatchConfidence,
  type ReconcileReceivable,
} from '@/lib/asaasReconciliation';
import { ReceiveConfirmModal } from '@/components/financial/receivable/ReceiveConfirmModal';
import { ReceivableFormModal, type ReceivablePrefill } from '@/components/financial/receivable/ReceivableFormModal';
import { BADGE_TONE, type BadgeTone } from '@/lib/statusBadge';

const PAID_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
const SETTLED_LOCAL = ['received', 'paid'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
};

const chargeIsPaid = (charge: AsaasCharge) => PAID_STATUSES.includes(charge.status);

const getAsaasStatusBadge = (status: string) => {
  const labels: Record<string, { label: string; tone: BadgeTone }> = {
    PENDING: { label: 'Pendente', tone: 'warning' },
    RECEIVED: { label: 'Recebido', tone: 'success' },
    RECEIVED_IN_CASH: { label: 'Recebido', tone: 'success' },
    CONFIRMED: { label: 'Confirmado', tone: 'success' },
    OVERDUE: { label: 'Vencido', tone: 'danger' },
  };
  const config = labels[status] || { label: status, tone: 'neutral' as BadgeTone };
  return <Badge variant="outline" className={BADGE_TONE[config.tone]}>{config.label}</Badge>;
};

const getLocalStatusBadge = (status: string) => {
  if (SETTLED_LOCAL.includes(status)) {
    return <Badge variant="outline" className={BADGE_TONE.success}>Recebido</Badge>;
  }
  if (status === 'canceled') return <Badge variant="outline" className={BADGE_TONE.neutral}>Cancelado</Badge>;
  if (status === 'overdue') return <Badge variant="outline" className={BADGE_TONE.danger}>Vencido</Badge>;
  return <Badge variant="outline" className={BADGE_TONE.warning}>Pendente</Badge>;
};

const confidenceBadge = (confidence: MatchConfidence, reason: string) => {
  const map: Record<MatchConfidence, { label: string; tone: BadgeTone }> = {
    high: { label: 'Sugestão forte', tone: 'success' },
    medium: { label: 'Sugestão média', tone: 'warning' },
    low: { label: 'Sugestão fraca', tone: 'neutral' },
  };
  const config = map[confidence];
  return (
    <Badge variant="outline" className={BADGE_TONE[config.tone]} title={reason}>
      {config.label}
    </Badge>
  );
};

const receivableName = (r: any) =>
  r?.client?.company_name || r?.client?.full_name || r?.payer_name || '—';

const todayStr = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(first), to: fmt(last) };
};

export function AsaasReconciliationPanel() {
  const { toast } = useToast();
  const { selectedAccountId } = useFinancialAccount();
  const defaultRange = todayStr();

  const [dateField, setDateField] = useState<'dueDate' | 'paymentDate'>('dueDate');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [charges, setCharges] = useState<AsaasCharge[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Baixa / vínculo
  const [baixaContext, setBaixaContext] = useState<{ receivable: any; charge: AsaasCharge } | null>(null);

  // Criação a partir de órfã
  const [prefill, setPrefill] = useState<ReceivablePrefill | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  // Picker para vincular órfã a lançamento existente
  const [linkingCharge, setLinkingCharge] = useState<AsaasCharge | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['asaas-settings-active'],
    queryFn: async () => {
      const { data } = await supabase.from('asaas_settings').select('is_active').single();
      return data;
    },
  });
  const asaasEnabled = settings?.is_active ?? false;

  const { data: receivables = [], refetch: refetchReceivables } = useQuery({
    queryKey: ['reconcile-receivables', selectedAccountId],
    queryFn: async () => {
      let query = supabase
        .from('accounts_receivable')
        .select(
          'id, asaas_payment_id, amount, due_date, status, client_id, payer_name, description, financial_account_id, client:clients(full_name, company_name)'
        )
        .neq('status', 'canceled');
      if (selectedAccountId !== 'all') {
        query = query.eq('financial_account_id', selectedAccountId);
      }
      const { data, error } = await query.order('due_date', { ascending: false }).limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const receivableById = useMemo(
    () => new Map(receivables.map((r: any) => [r.id, r])),
    [receivables]
  );

  const result = useMemo(
    () => classifyCharges(charges, receivables as unknown as ReconcileReceivable[]),
    [charges, receivables]
  );

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-asaas-payments', {
        body: {
          dateField,
          dateFrom,
          dateTo,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao buscar cobranças');
      setCharges(data.charges || []);
      setHasSearched(true);
    } catch (error: any) {
      toast({ title: 'Erro ao buscar no Asaas', description: error.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const asaasLinkFields = (charge: AsaasCharge) => ({
    asaas_payment_id: charge.id,
    asaas_customer_id: charge.customerId,
    asaas_invoice_url: charge.invoiceUrl,
    asaas_status: charge.status,
    asaas_billing_type: charge.billingType,
    sync_with_asaas: true,
  });

  const handleConfirmBaixa = async (payload: { id: string; payment_date: string; amount: number }) => {
    if (!baixaContext) return;
    const { charge } = baixaContext;
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({
          status: 'received',
          payment_date: payload.payment_date,
          payment_confirmation_date: charge.confirmedDate || null,
          amount: payload.amount,
          ...asaasLinkFields(charge),
        })
        .eq('id', payload.id);
      if (error) throw error;
      toast({ title: 'Baixa confirmada', description: 'Lançamento marcado como recebido e vinculado ao Asaas.' });
      setBaixaContext(null);
      refetchReceivables();
    } catch (error: any) {
      toast({ title: 'Erro ao dar baixa', description: error.message, variant: 'destructive' });
    }
  };

  const handleLink = async (receivable: any, charge: AsaasCharge, withBaixa: boolean) => {
    try {
      const updateData: any = { ...asaasLinkFields(charge) };
      if (withBaixa) {
        updateData.status = 'received';
        updateData.payment_date = charge.paymentDate || charge.confirmedDate;
        updateData.payment_confirmation_date = charge.confirmedDate || null;
      }
      const { error } = await supabase.from('accounts_receivable').update(updateData).eq('id', receivable.id);
      if (error) throw error;
      toast({
        title: withBaixa ? 'Vinculado e baixado' : 'Vinculado ao Asaas',
        description: withBaixa
          ? 'Lançamento vinculado e marcado como recebido.'
          : 'Lançamento vinculado à cobrança do Asaas.',
      });
      setLinkingCharge(null);
      setLinkSearch('');
      refetchReceivables();
    } catch (error: any) {
      toast({ title: 'Erro ao vincular', description: error.message, variant: 'destructive' });
    }
  };

  const handleSync = async (receivableId: string) => {
    setSyncingId(receivableId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-asaas-payment', {
        body: { receivableId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao sincronizar');
      toast({ title: 'Sincronizado', description: 'Status atualizado a partir do Asaas.' });
      refetchReceivables();
    } catch (error: any) {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    } finally {
      setSyncingId(null);
    }
  };

  const openCreateFromCharge = (charge: AsaasCharge) => {
    setPrefill({
      client_id: charge.localClientId || undefined,
      payer_name: charge.localClientId ? undefined : charge.customerName || undefined,
      description: charge.description || undefined,
      amount: charge.value != null ? charge.value.toFixed(2) : undefined,
      due_date: charge.dueDate ? new Date(`${charge.dueDate}T00:00:00`) : undefined,
      financial_account_id: selectedAccountId !== 'all' ? selectedAccountId : undefined,
    });
    setCreateOpen(true);
  };

  const linkableReceivables = useMemo(() => {
    const term = linkSearch.toLowerCase().trim();
    return receivables
      .filter((r: any) => !r.asaas_payment_id)
      .filter((r: any) => {
        if (!term) return true;
        return (
          (r.description || '').toLowerCase().includes(term) ||
          receivableName(r).toLowerCase().includes(term)
        );
      })
      .slice(0, 50);
  }, [receivables, linkSearch]);

  if (!asaasEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliação Asaas</CardTitle>
          <CardDescription>
            A integração com Asaas não está ativa. Ative em Configurações → Integrações.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliação Asaas</CardTitle>
          <CardDescription>
            Busque as cobranças do Asaas e confirme a baixa nos seus lançamentos manuais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Filtrar por</Label>
              <Select value={dateField} onValueChange={(v) => setDateField(v as any)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Data de vencimento</SelectItem>
                  <SelectItem value="paymentDate">Data de pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status no Asaas</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RECEIVED">Recebido</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="OVERDUE">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar no Asaas
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Escolha o período e clique em “Buscar no Asaas” para iniciar a conciliação.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* A confirmar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                A confirmar ({result.suggested.length})
              </CardTitle>
              <CardDescription>Cobranças do Asaas com casamento sugerido para seus lançamentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cobrança (Asaas)</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status Asaas</TableHead>
                      <TableHead>Lançamento sugerido</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.suggested.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          Nenhuma sugestão de casamento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.suggested.map(({ charge, receivable, confidence, reason }) => {
                        const local = receivableById.get(receivable.id);
                        const settled = SETTLED_LOCAL.includes(receivable.status);
                        const paid = chargeIsPaid(charge);
                        return (
                          <TableRow key={charge.id}>
                            <TableCell className="font-medium">
                              {charge.customerName || charge.description || charge.id}
                            </TableCell>
                            <TableCell>{formatCurrency(charge.value)}</TableCell>
                            <TableCell>{formatDate(charge.dueDate)}</TableCell>
                            <TableCell>{getAsaasStatusBadge(charge.status)}</TableCell>
                            <TableCell>
                              <div className="text-sm">{receivable.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {receivableName(local)} · vence {formatDate(receivable.due_date)}
                              </div>
                            </TableCell>
                            <TableCell>{confidenceBadge(confidence, reason)}</TableCell>
                            <TableCell className="text-right">
                              {paid && !settled ? (
                                <Button size="sm" onClick={() => setBaixaContext({ receivable: local, charge })}>
                                  Confirmar baixa
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleLink(local, charge, false)}>
                                  <Link2 className="h-4 w-4 mr-1" /> Vincular
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sem par */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Sem par ({result.orphans.length})
              </CardTitle>
              <CardDescription>Cobranças do Asaas sem lançamento correspondente no sistema.</CardDescription>
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
                      <TableHead>Status Asaas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.orphans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nenhuma cobrança órfã no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.orphans.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell className="font-medium">{charge.customerName || '—'}</TableCell>
                          <TableCell>{charge.description || '—'}</TableCell>
                          <TableCell>{formatCurrency(charge.value)}</TableCell>
                          <TableCell>{formatDate(charge.dueDate)}</TableCell>
                          <TableCell>{getAsaasStatusBadge(charge.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setLinkingCharge(charge)}>
                                <Link2 className="h-4 w-4 mr-1" /> Vincular
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openCreateFromCharge(charge)}>
                                <Plus className="h-4 w-4 mr-1" /> Criar
                              </Button>
                              {charge.invoiceUrl && (
                                <Button size="sm" variant="ghost" onClick={() => window.open(charge.invoiceUrl!, '_blank')}>
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

          {/* Vinculados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vinculados ({result.linked.length})</CardTitle>
              <CardDescription>Cobranças já associadas a lançamentos. Sincronize para atualizar o status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status Local</TableHead>
                      <TableHead>Status Asaas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.linked.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nenhuma cobrança vinculada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.linked.map(({ charge, receivable }) => {
                        const local = receivableById.get(receivable.id);
                        return (
                          <TableRow key={charge.id}>
                            <TableCell className="font-medium">{receivableName(local) || charge.customerName}</TableCell>
                            <TableCell>{receivable.description}</TableCell>
                            <TableCell>{formatCurrency(receivable.amount)}</TableCell>
                            <TableCell>{getLocalStatusBadge(receivable.status)}</TableCell>
                            <TableCell>{getAsaasStatusBadge(charge.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSync(receivable.id)}
                                  disabled={syncingId === receivable.id}
                                >
                                  <RefreshCw className={`h-4 w-4 ${syncingId === receivable.id ? 'animate-spin' : ''}`} />
                                </Button>
                                {charge.invoiceUrl && (
                                  <Button size="sm" variant="ghost" onClick={() => window.open(charge.invoiceUrl!, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de baixa */}
      <ReceiveConfirmModal
        open={!!baixaContext}
        onOpenChange={(open) => !open && setBaixaContext(null)}
        account={
          baixaContext
            ? {
                id: baixaContext.receivable.id,
                description: baixaContext.receivable.description,
                amount: baixaContext.receivable.amount,
                due_date: baixaContext.receivable.due_date,
              }
            : null
        }
        onConfirm={handleConfirmBaixa}
      />

      {/* Modal de criação a partir de órfã */}
      <ReceivableFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefill={prefill}
        onSuccess={() => {
          setCreateOpen(false);
          setPrefill(undefined);
          refetchReceivables();
        }}
      />

      {/* Picker: vincular órfã a lançamento existente */}
      <Dialog open={!!linkingCharge} onOpenChange={(open) => { if (!open) { setLinkingCharge(null); setLinkSearch(''); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular cobrança a um lançamento</DialogTitle>
          </DialogHeader>
          {linkingCharge && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {linkingCharge.customerName || '—'} · {formatCurrency(linkingCharge.value)} · vence {formatDate(linkingCharge.dueDate)}
                {chargeIsPaid(linkingCharge) && ' · será dada baixa (cobrança paga)'}
              </div>
              <Input placeholder="Buscar lançamento..." value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} />
              <div className="max-h-80 overflow-auto rounded-md border divide-y">
                {linkableReceivables.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum lançamento disponível.</div>
                ) : (
                  linkableReceivables.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{r.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {receivableName(r)} · {formatCurrency(r.amount)} · vence {formatDate(r.due_date)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLink(r, linkingCharge, chargeIsPaid(linkingCharge))}
                      >
                        Vincular
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
