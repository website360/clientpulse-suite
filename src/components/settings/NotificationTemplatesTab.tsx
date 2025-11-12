import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Bell, ToggleLeft, ToggleRight, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { NotificationTemplateFormModal } from './notifications/NotificationTemplateFormModal';
import { TestNotificationModal } from './notifications/TestNotificationModal';
import { NotificationLogsPanel } from './notifications/NotificationLogsPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EVENT_TYPE_LABELS: Record<string, string> = {
  ticket_created: 'Ticket Criado',
  ticket_assigned: 'Ticket Atribuído',
  ticket_status_changed: 'Status do Ticket Alterado',
  ticket_message: 'Nova Mensagem no Ticket',
  ticket_response_admin: 'Ticket Respondido por Admin',
  ticket_response_client: 'Ticket Respondido por Cliente',
  ticket_response_contact: 'Ticket Respondido por Contato',
  ticket_resolved: 'Ticket Resolvido',
  ticket_closed: 'Ticket Fechado',
  ticket_reopened: 'Ticket Reaberto',
  payment_due: 'Cobrança Vencendo',
  payment_overdue: 'Cobrança Vencida',
  payment_received: 'Pagamento Recebido',
  contract_expiring: 'Contrato Vencendo',
  contract_expired: 'Contrato Vencido',
  domain_expiring: 'Domínio Vencendo',
  domain_expired: 'Domínio Vencido',
  maintenance_scheduled: 'Manutenção Agendada',
  maintenance_completed: 'Manutenção Concluída',
  task_assigned: 'Tarefa Atribuída',
  task_due: 'Tarefa Vencendo',
  custom: 'Personalizado',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  telegram: 'Telegram',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  telegram: 'bg-sky-500',
  sms: 'bg-green-500',
  whatsapp: 'bg-emerald-500',
};

export function NotificationTemplatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [templateToTest, setTemplateToTest] = useState<any>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('event_type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Remove duplicates based on id
      const uniqueTemplates = data?.reduce((acc: any[], current) => {
        const exists = acc.find(item => item.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      return uniqueTemplates || [];
    },
  });

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleTest = (template: any) => {
    setTemplateToTest(template);
    setTestModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateToDelete);

      if (error) throw error;

      toast({
        title: 'Template excluído',
        description: 'O template foi excluído com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleToggleActive = async (template: any) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: template.is_active ? 'Template desativado' : 'Template ativado',
        description: `O template foi ${template.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o template.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Templates de Notificação</CardTitle>
                <CardDescription>
                  Gerencie templates para envio automático de notificações
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando templates...
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum template cadastrado
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.is_active ? (
                          <Badge variant="default" className="bg-green-500">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>

                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Evento:</span>
                          <Badge variant="outline">
                            {EVENT_TYPE_LABELS[template.event_type] || template.event_type}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Canais:</span>
                          <div className="flex gap-1">
                            {template.channels?.map((channel: string) => (
                              <Badge
                                key={channel}
                                className={`${CHANNEL_COLORS[channel]} text-white`}
                              >
                                {CHANNEL_LABELS[channel] || channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        {template.send_to_client && <span>✓ Cliente</span>}
                        {template.send_to_admins && <span>✓ Admins</span>}
                        {template.send_to_assigned && <span>✓ Atribuído</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTest(template)}
                        title="Testar template"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(template)}
                        title={template.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {template.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NotificationTemplateFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />

      <TestNotificationModal
        open={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          setTemplateToTest(null);
        }}
        template={templateToTest}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NotificationLogsPanel />
    </div>
  );
}
