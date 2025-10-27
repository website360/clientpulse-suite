import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MaintenancePlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  plan?: any;
}

export function MaintenancePlanFormModal({ open, onOpenChange, clientId: propClientId, plan }: MaintenancePlanFormModalProps) {
  const [clientId, setClientId] = useState<string>(propClientId || 'none');
  const [domainId, setDomainId] = useState<string>('none');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients-for-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, responsible_name, company_name, client_type')
        .eq('is_active', true)
        .order('responsible_name', { nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !propClientId,
  });

  const { data: domains } = useQuery({
    queryKey: ['client-domains', clientId],
    queryFn: async () => {
      if (clientId === 'none') return [];
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('client_id', clientId)
        .order('domain');
      if (error) throw error;
      return data;
    },
    enabled: open && clientId !== 'none',
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
      setClientId(plan.client_id);
      setDomainId(plan.domain_id || 'none');
      setStartDate(plan.start_date ? new Date(plan.start_date) : undefined);
      setIsActive(plan.is_active);
    } else {
      if (propClientId) {
        setClientId(propClientId);
      } else {
        setClientId('none');
      }
      if (settings) {
        setDomainId('none');
        // Set default to next month, day from settings
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 1);
        defaultDate.setDate(settings.default_monthly_day);
        setStartDate(defaultDate);
        setIsActive(true);
      }
    }
  }, [plan, settings, open, propClientId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (clientId === 'none') {
        throw new Error('Selecione um cliente');
      }

      if (!startDate) {
        throw new Error('Selecione a data da primeira manutenção');
      }

      const planData = {
        client_id: clientId,
        domain_id: domainId === 'none' ? null : domainId,
        monthly_day: startDate.getDate(),
        start_date: startDate.toISOString().split('T')[0],
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
        const { data: existing, error: checkError } = await supabase
          .from('client_maintenance_plans')
          .select('id')
          .eq('client_id', clientId)
          .eq('domain_id', domainId === 'none' ? null : domainId)
          .maybeSingle();

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
          {!propClientId && (
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um cliente</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label htmlFor="start-date">Data da Primeira Manutenção *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              A manutenção se repetirá todo dia {startDate?.getDate() || 1} de cada mês
            </p>
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
