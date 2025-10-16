import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface MaintenancePlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  plan?: any;
}

export function MaintenancePlanFormModal({ open, onOpenChange, clientId, plan }: MaintenancePlanFormModalProps) {
  const [domainId, setDomainId] = useState<string>('none');
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const queryClient = useQueryClient();

  const { data: domains } = useQuery({
    queryKey: ['client-domains', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('client_id', clientId)
        .order('domain');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: settings } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !plan,
  });

  useEffect(() => {
    if (plan) {
      setDomainId(plan.domain_id || 'none');
      setMonthlyDay(plan.monthly_day);
      setIsActive(plan.is_active);
    } else if (settings) {
      setDomainId('none');
      setMonthlyDay(settings.default_monthly_day);
      setIsActive(true);
    }
  }, [plan, settings, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const planData = {
        client_id: clientId,
        domain_id: domainId === 'none' ? null : domainId,
        monthly_day: monthlyDay,
        is_active: isActive,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (plan) {
        const { error } = await supabase
          .from('client_maintenance_plans')
          .update(planData)
          .eq('id', plan.id);
        if (error) throw error;
      } else {
        // Check for duplicate
        const { data: existing } = await supabase
          .from('client_maintenance_plans')
          .select('id')
          .eq('client_id', clientId)
          .eq('domain_id', domainId === 'none' ? null : domainId)
          .single();

        if (existing) {
          throw new Error('Já existe um plano para este cliente/domínio');
        }

        const { error } = await supabase
          .from('client_maintenance_plans')
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(plan ? 'Plano atualizado com sucesso' : 'Plano criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['client-maintenance-plans', clientId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar plano: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar' : 'Novo'} Plano de Manutenção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger id="domain">
                <SelectValue placeholder="Sem domínio específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem domínio específico</SelectItem>
                {domains?.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-day">Dia do Mês</Label>
            <Select value={monthlyDay.toString()} onValueChange={(v) => setMonthlyDay(Number(v))}>
              <SelectTrigger id="monthly-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Plano Ativo</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
