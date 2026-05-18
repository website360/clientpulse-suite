import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Wallet, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFinancialAccount, type FinancialAccount } from '@/contexts/FinancialAccountContext';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

interface FormState {
  name: string;
  type: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

const empty: FormState = {
  name: '',
  type: 'empresa',
  color: PRESET_COLORS[0],
  is_default: false,
  is_active: true,
  display_order: 0,
};

export default function FinancialAccounts() {
  const queryClient = useQueryClient();
  const { refetch } = useFinancialAccount();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [toDelete, setToDelete] = useState<FinancialAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['financial-accounts-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as FinancialAccount[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['financial-accounts-admin'] });
    refetch();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('O nome é obrigatório');
      const payload = {
        name: form.name.trim(),
        type: form.type || null,
        color: form.color || null,
        is_default: form.is_default,
        is_active: form.is_active,
        display_order: form.display_order,
      };
      if (editing) {
        const { error } = await supabase.from('financial_accounts').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_accounts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Conta atualizada' : 'Conta criada');
      setOpen(false);
      setEditing(null);
      setForm(empty);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta excluída');
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) =>
      toast.error(
        'Não foi possível excluir esta conta. Provavelmente há lançamentos vinculados — reclassifique-os antes.',
      ),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, display_order: (accounts[accounts.length - 1]?.display_order ?? -1) + 1 });
    setOpen(true);
  };

  const openEdit = (a: FinancialAccount) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type || 'empresa',
      color: a.color || PRESET_COLORS[0],
      is_default: a.is_default,
      is_active: a.is_active,
      display_order: a.display_order,
    });
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Contas Financeiras
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as contas que organizam seus lançamentos (Pessoal, Empresa, Escritório, etc.).
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contas cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma conta cadastrada. Crie a primeira.
              </p>
            ) : (
              <div className="divide-y">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: a.color || '#94a3b8' }}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {a.name}
                          {a.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Padrão
                            </Badge>
                          )}
                          {!a.is_active && <Badge variant="outline" className="text-xs">Inativa</Badge>}
                        </div>
                        {a.type && (
                          <div className="text-xs text-muted-foreground capitalize">{a.type}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(a)}
                        disabled={a.is_default}
                        title={a.is_default ? 'A conta padrão não pode ser excluída' : 'Excluir'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="acc-name">Nome</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Pessoal, Empresa, Escritório"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-type">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="acc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="escritorio">Escritório</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-order">Ordem de exibição</Label>
              <Input
                id="acc-order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded border bg-muted/30">
              <div>
                <Label htmlFor="acc-default" className="text-sm">Conta padrão</Label>
                <p className="text-xs text-muted-foreground">
                  Lançamentos criados sem conta específica vão para ela.
                </p>
              </div>
              <Switch
                id="acc-default"
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded border bg-muted/30">
              <div>
                <Label htmlFor="acc-active" className="text-sm">Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Contas inativas não aparecem no seletor.
                </p>
              </div>
              <Switch
                id="acc-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Só é possível excluir contas sem lançamentos vinculados. Se houver lançamentos, reclassifique-os antes em outra conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
