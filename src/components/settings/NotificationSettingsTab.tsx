import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, MessageCircle, MessageSquare, Smartphone, Clock, Ticket, FolderKanban, DollarSign, FileText, Wrench, CheckSquare } from 'lucide-react';

const EVENT_CATEGORIES = {
  tickets: {
    label: 'Tickets',
    icon: 'Ticket',
    events: {
      ticket_created: 'Novo Ticket Criado',
      ticket_assigned: 'Ticket Atribuído',
      ticket_response_admin: 'Resposta do Admin no Ticket',
      ticket_response_client: 'Resposta do Cliente no Ticket',
      ticket_response_contact: 'Resposta do Contato no Ticket',
      ticket_resolved: 'Ticket Resolvido',
      ticket_closed: 'Ticket Fechado',
      ticket_reopened: 'Ticket Reaberto',
    }
  },
  projects: {
    label: 'Projetos',
    icon: 'FolderKanban',
    events: {
      approval_reminder_normal: 'Lembrete de Aprovação (Normal)',
      approval_reminder_medium: 'Lembrete de Aprovação (Média)',
      approval_reminder_high: 'Lembrete de Aprovação (Alta)',
    }
  },
  financial: {
    label: 'Financeiro',
    icon: 'DollarSign',
    events: {
      payment_received: 'Pagamento Recebido',
      payment_due: 'Pagamento Próximo do Vencimento',
      payment_overdue: 'Pagamento Vencido',
    }
  },
  contracts: {
    label: 'Contratos & Domínios',
    icon: 'FileText',
    events: {
      contract_expiring: 'Contrato Próximo do Vencimento',
      domain_expiring: 'Domínio Próximo do Vencimento',
    }
  },
  maintenance: {
    label: 'Manutenção',
    icon: 'Wrench',
    events: {
      maintenance_scheduled: 'Manutenção Agendada',
      maintenance_completed: 'Manutenção Concluída',
    }
  },
  tasks: {
    label: 'Tarefas',
    icon: 'CheckSquare',
    events: {
      task_assigned: 'Tarefa Atribuída',
      task_due: 'Tarefa Próxima do Prazo',
    }
  },
};

interface NotificationSetting {
  id: string;
  event_type: string;
  email_enabled: boolean;
  telegram_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_enabled: boolean;
}

export function NotificationSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .is('user_id', null)
        .order('event_type');
      
      if (error) throw error;
      return data as NotificationSetting[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotificationSetting> }) => {
      const { error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({
        title: 'Configuração atualizada',
        description: 'As configurações de notificação foram atualizadas.',
      });
    },
    onError: (error) => {
      console.error('Error updating notification setting:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar as configurações.',
        variant: 'destructive',
      });
    },
  });

  const updateAllQuietHours = async () => {
    try {
      const updates = settings?.map(setting => ({
        id: setting.id,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        quiet_hours_enabled: quietHoursEnabled,
      }));

      for (const update of updates || []) {
        await supabase
          .from('notification_settings')
          .update({
            quiet_hours_start: update.quiet_hours_start,
            quiet_hours_end: update.quiet_hours_end,
            quiet_hours_enabled: update.quiet_hours_enabled,
          })
          .eq('id', update.id);
      }

      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({
        title: 'Horários atualizados',
        description: 'Os horários de silêncio foram aplicados a todos os eventos.',
      });
    } catch (error) {
      console.error('Error updating quiet hours:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar os horários.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horário de Silêncio
          </CardTitle>
          <CardDescription>
            Configure os horários em que as notificações não devem ser enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="quiet-hours-enabled"
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
            <Label htmlFor="quiet-hours-enabled">
              Ativar horário de silêncio
            </Label>
          </div>
          
          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Início</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">Fim</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <Button onClick={updateAllQuietHours}>
            Aplicar a Todos os Eventos
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {Object.entries(EVENT_CATEGORIES).map(([categoryKey, category]) => {
          const categorySettings = settings?.filter(s => 
            Object.keys(category.events).includes(s.event_type)
          );
          
          if (!categorySettings || categorySettings.length === 0) return null;
          
          const IconComponent = {
            Ticket,
            FolderKanban,
            DollarSign,
            FileText,
            Wrench,
            CheckSquare,
          }[category.icon] || Bell;
          
          return (
            <Card key={categoryKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  {category.label}
                </CardTitle>
                <CardDescription>
                  Configure as notificações para eventos de {category.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categorySettings.map((setting) => (
                    <div key={setting.id} className="border rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">
                        {category.events[setting.event_type] || setting.event_type}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${setting.id}-email`}
                            checked={setting.email_enabled}
                            onCheckedChange={(checked) =>
                              updateSettingMutation.mutate({
                                id: setting.id,
                                updates: { email_enabled: checked },
                              })
                            }
                          />
                          <Label htmlFor={`${setting.id}-email`} className="text-sm">
                            Email
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${setting.id}-telegram`}
                            checked={setting.telegram_enabled}
                            onCheckedChange={(checked) =>
                              updateSettingMutation.mutate({
                                id: setting.id,
                                updates: { telegram_enabled: checked },
                              })
                            }
                          />
                          <Label htmlFor={`${setting.id}-telegram`} className="text-sm">
                            Telegram
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${setting.id}-sms`}
                            checked={setting.sms_enabled}
                            onCheckedChange={(checked) =>
                              updateSettingMutation.mutate({
                                id: setting.id,
                                updates: { sms_enabled: checked },
                              })
                            }
                          />
                          <Label htmlFor={`${setting.id}-sms`} className="text-sm">
                            SMS
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${setting.id}-whatsapp`}
                            checked={setting.whatsapp_enabled}
                            onCheckedChange={(checked) =>
                              updateSettingMutation.mutate({
                                id: setting.id,
                                updates: { whatsapp_enabled: checked },
                              })
                            }
                          />
                          <Label htmlFor={`${setting.id}-whatsapp`} className="text-sm">
                            WhatsApp
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}