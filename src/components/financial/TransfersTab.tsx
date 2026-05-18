import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, ArrowRightLeft, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const INTERNAL_CLIENT_EMAIL = 'sistema@interno.local';
const INTERNAL_SUPPLIER_NAME = 'Sistema – Transferência Interna';
const CATEGORY = 'Transferência entre contas';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseCurrencyInput(v: string): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

interface TransferRow {
  id: string;
  amount: number;
  transfer_date: string;
  description: string | null;
  source_account_id: string;
  target_account_id: string;
  payable_id: string | null;
  receivable_id: string | null;
}

export function TransfersTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { accounts, selectedAccountId } = useFinancialAccount();

  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TransferRow | null>(null);

  const [form, setForm] = useState({
    source_account_id: selectedAccountId !== 'all' ? selectedAccountId : '',
    target_account_id: '',
    amount: '',
    transfer_date: formatDateInput(new Date()),
    description: '',
  });

  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['financial-transfers', selectedAccountId],
    queryFn: async () => {
      let q = supabase
        .from('financial_transfers')
        .select('*')
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (selectedAccountId !== 'all') {
        q = q.or(`source_account_id.eq.${selectedAccountId},target_account_id.eq.${selectedAccountId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TransferRow[];
    },
  });

  const openCreate = () => {
    setForm({
      source_account_id: selectedAccountId !== 'all' ? selectedAccountId : '',
      target_account_id: '',
      amount: '',
      transfer_date: formatDateInput(new Date()),
      description: '',
    });
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = parseCurrencyInput(form.amount);
      if (!form.source_account_id || !form.target_account_id) {
        throw new Error('Selecione as duas contas');
      }
      if (form.source_account_id === form.target_account_id) {
        throw new Error('As contas de origem e destino devem ser diferentes');
      }
      if (amount <= 0) throw new Error('Valor deve ser maior que zero');

      // Resolve cliente e fornecedor internos (criados pela migration)
      const { data: clientRow, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('email', INTERNAL_CLIENT_EMAIL)
        .maybeSingle();
      if (clientErr) throw clientErr;
      if (!clientRow) throw new Error('Cliente interno não encontrado — execute a migration');

      const { data: supplierRow, error: supplierErr } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', INTERNAL_SUPPLIER_NAME)
        .maybeSingle();
      if (supplierErr) throw supplierErr;
      if (!supplierRow) throw new Error('Fornecedor interno não encontrado — execute a migration');

      const sourceName = accountsById[form.source_account_id]?.name || 'Origem';
      const targetName = accountsById[form.target_account_id]?.name || 'Destino';
      const desc = form.description?.trim() || `Transferência: ${sourceName} → ${targetName}`;

      // 1) Saída na conta de origem (paga)
      const { data: payable, error: payableErr } = await supabase
        .from('accounts_payable')
        .insert({
          financial_account_id: form.source_account_id,
          supplier_id: supplierRow.id,
          amount,
          description: desc,
          category: CATEGORY,
          due_date: form.transfer_date,
          issue_date: form.transfer_date,
          payment_date: form.transfer_date,
          status: 'paid',
          occurrence_type: 'unica',
          created_by: user!.id,
        })
        .select('id')
        .single();
      if (payableErr) throw payableErr;

      // 2) Entrada na conta de destino (recebida)
      const { data: receivable, error: receivableErr } = await supabase
        .from('accounts_receivable')
        .insert({
          financial_account_id: form.target_account_id,
          client_id: clientRow.id,
          amount,
          description: desc,
          category: CATEGORY,
          due_date: form.transfer_date,
          issue_date: form.transfer_date,
          payment_date: form.transfer_date,
          status: 'paid',
          occurrence_type: 'unica',
          created_by: user!.id,
        })
        .select('id')
        .single();
      if (receivableErr) throw receivableErr;

      // 3) Registro de transferência ligando os dois
      const { error: transferErr } = await supabase.from('financial_transfers').insert({
        source_account_id: form.source_account_id,
        target_account_id: form.target_account_id,
        amount,
        transfer_date: form.transfer_date,
        description: form.description?.trim() || null,
        payable_id: payable.id,
        receivable_id: receivable.id,
        created_by: user!.id,
      });
      if (transferErr) throw transferErr;
    },
    onSuccess: () => {
      toast.success('Transferência registrada');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financial-transfers'] });
      // Stats e listas podem mudar — invalidar genericamente
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey as string[]).some((k) => typeof k === 'string' && (k.startsWith('projected-') || k.startsWith('dre-') || k.startsWith('client-profitability') || k.startsWith('overdue-') || k.startsWith('financial-'))) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (t: TransferRow) => {
      // Apaga primeiro a transferência; depois os lançamentos vinculados
      const { error: tErr } = await supabase.from('financial_transfers').delete().eq('id', t.id);
      if (tErr) throw tErr;
      if (t.payable_id) {
        await supabase.from('accounts_payable').delete().eq('id', t.payable_id);
      }
      if (t.receivable_id) {
        await supabase.from('accounts_receivable').delete().eq('id', t.receivable_id);
      }
    },
    onSuccess: () => {
      toast.success('Transferência excluída');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['financial-transfers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferências entre contas
            </CardTitle>
            <CardDescription>
              Movimenta valores de uma conta para outra. Cria automaticamente uma saída na origem e uma entrada no destino, ambas marcadas como liquidadas.
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={accounts.length < 2}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transferência
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Cadastre ao menos 2 contas para fazer transferências.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transferência registrada{selectedAccountId !== 'all' ? ' para esta conta' : ''}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.transfer_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>{accountsById[t.source_account_id]?.name || '—'}</TableCell>
                    <TableCell>{accountsById[t.target_account_id]?.name || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(t.amount))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.description || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(t)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nova Transferência</DialogTitle>
            <DialogDescription>
              Gera um par de lançamentos (saída na origem + entrada no destino), ambos com status "liquidado".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>De (Origem)</Label>
                <Select
                  value={form.source_account_id}
                  onValueChange={(v) => setForm({ ...form, source_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Conta de origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Para (Destino)</Label>
                <Select
                  value={form.target_account_id}
                  onValueChange={(v) => setForm({ ...form, target_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== form.source_account_id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.transfer_date}
                  onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Reembolso de despesa, aporte, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dois lançamentos vinculados (saída e entrada) também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
