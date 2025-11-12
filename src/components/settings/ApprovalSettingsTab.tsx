import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ApprovalSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['approval-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    days_before_notification: settings?.days_before_notification || 3,
    notification_frequency_days: settings?.notification_frequency_days || 2,
    email_enabled: settings?.email_enabled ?? true,
    whatsapp_enabled: settings?.whatsapp_enabled ?? true,
  });

  // Atualizar formData quando settings carregar
  useState(() => {
    if (settings) {
      setFormData({
        days_before_notification: settings.days_before_notification,
        notification_frequency_days: settings.notification_frequency_days,
        email_enabled: settings.email_enabled,
        whatsapp_enabled: settings.whatsapp_enabled,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) {
        // Criar novo registro se não existir
        const { error } = await supabase
          .from('approval_settings')
          .insert(formData);

        if (error) throw error;
      } else {
        // Atualizar registro existente
        const { error } = await supabase
          .from('approval_settings')
          .update(formData)
          .eq('id', settings.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de aprovação foram atualizadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notificações de Aprovação</h3>
        <p className="text-sm text-muted-foreground">
          Configure quando e como notificar clientes sobre aprovações pendentes
        </p>
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Regras de Notificação
            </CardTitle>
            <CardDescription>
              Defina quando as notificações automáticas devem ser enviadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days_before_notification">
                Dias antes da primeira notificação
              </Label>
              <Input
                id="days_before_notification"
                type="number"
                min="1"
                max="30"
                value={formData.days_before_notification}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    days_before_notification: parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Enviar notificação se a aprovação estiver pendente há mais de X dias
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_frequency_days">
                Frequência de lembretes (dias)
              </Label>
              <Input
                id="notification_frequency_days"
                type="number"
                min="1"
                max="14"
                value={formData.notification_frequency_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notification_frequency_days: parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Enviar lembretes a cada X dias após a primeira notificação
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canais de Notificação</CardTitle>
            <CardDescription>
              Selecione quais canais devem ser usados para enviar lembretes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_enabled">Notificações por Email</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar lembretes por email para o cliente
                </p>
              </div>
              <Switch
                id="email_enabled"
                checked={formData.email_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, email_enabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsapp_enabled">Notificações por WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar lembretes por WhatsApp para o cliente
                </p>
              </div>
              <Switch
                id="whatsapp_enabled"
                checked={formData.whatsapp_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, whatsapp_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Verificação automática</p>
            <p className="text-xs text-muted-foreground">
              O sistema verifica aprovações pendentes automaticamente a cada 6 horas
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
