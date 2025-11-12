import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toastSuccess, toastError, toastWarning } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface TestNotificationModalProps {
  open: boolean;
  onClose: () => void;
  template: any;
}

const MOCK_DATA: Record<string, Record<string, string>> = {
  ticket_created: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    contact_name: 'João Silva',
    department: 'Suporte Técnico',
    priority: 'Alta',
    subject: 'Problema no sistema de login',
    description: 'Não consigo acessar o sistema com minhas credenciais',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_assigned: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    assigned_to: 'Maria Santos',
    subject: 'Problema no sistema de login',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_response_admin: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    admin_name: 'Maria Santos',
    subject: 'Problema no sistema de login',
    message: 'Olá! Verifiquei seu problema e já estou trabalhando na solução.',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_response_client: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    contact_name: 'João Silva',
    subject: 'Problema no sistema de login',
    message: 'Obrigado pelo retorno! Aguardo a solução.',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_response_contact: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    contact_name: 'João Silva',
    subject: 'Problema no sistema de login',
    message: 'Ainda não consegui acessar o sistema.',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_resolved: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    subject: 'Problema no sistema de login',
    resolved_by: 'Maria Santos',
    resolution_notes: 'Credenciais resetadas e novo link de acesso enviado por email.',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_closed: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    subject: 'Problema no sistema de login',
    closed_by: 'Maria Santos',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  ticket_reopened: {
    ticket_number: '12345',
    client_name: 'Empresa Exemplo Ltda',
    subject: 'Problema no sistema de login',
    reopened_by: 'João Silva',
    reopen_reason: 'O problema voltou a ocorrer',
    ticket_url: 'https://sistema.com/tickets/12345',
  },
  payment_due: {
    invoice_number: 'FAT-2024-001',
    client_name: 'Empresa Exemplo Ltda',
    amount: 'R$ 1.500,00',
    due_date: '15/01/2024',
    payment_link: 'https://sistema.com/pagamentos/FAT-2024-001',
  },
  payment_overdue: {
    invoice_number: 'FAT-2024-001',
    client_name: 'Empresa Exemplo Ltda',
    amount: 'R$ 1.500,00',
    due_date: '15/01/2024',
    days_overdue: '5',
    payment_link: 'https://sistema.com/pagamentos/FAT-2024-001',
  },
  payment_received: {
    invoice_number: 'FAT-2024-001',
    client_name: 'Empresa Exemplo Ltda',
    amount: 'R$ 1.500,00',
    payment_date: '14/01/2024',
    payment_method: 'PIX',
  },
  contract_expiring: {
    client_name: 'Empresa Exemplo Ltda',
    service_name: 'Hospedagem e Manutenção',
    expiry_date: '31/01/2024',
    days_until_expiry: '15',
    contract_url: 'https://sistema.com/contratos/123',
  },
  contract_expired: {
    client_name: 'Empresa Exemplo Ltda',
    service_name: 'Hospedagem e Manutenção',
    expiry_date: '31/12/2023',
    contract_url: 'https://sistema.com/contratos/123',
  },
  domain_expiring: {
    domain: 'exemplo.com.br',
    client_name: 'Empresa Exemplo Ltda',
    expiry_date: '31/01/2024',
    days_until_expiry: '15',
    renewal_link: 'https://sistema.com/dominios/exemplo.com.br',
  },
  domain_expired: {
    domain: 'exemplo.com.br',
    client_name: 'Empresa Exemplo Ltda',
    expiry_date: '31/12/2023',
    renewal_link: 'https://sistema.com/dominios/exemplo.com.br',
  },
  maintenance_scheduled: {
    client_name: 'Empresa Exemplo Ltda',
    site_url: 'https://exemplo.com.br',
    scheduled_date: '20/01/2024',
    scheduled_time: '14:00',
  },
  maintenance_completed: {
    client_name: 'Empresa Exemplo Ltda',
    site_url: 'https://exemplo.com.br',
    completed_date: '20/01/2024',
    checklist: '✓ Backup realizado\n✓ Plugins atualizados\n✓ Sistema testado',
  },
  task_assigned: {
    task_title: 'Revisar proposta comercial',
    assigned_to: 'Carlos Oliveira',
    assigned_by: 'Maria Santos',
    due_date: '25/01/2024',
    priority: 'Alta',
    task_url: 'https://sistema.com/tarefas/456',
  },
  task_due: {
    task_title: 'Revisar proposta comercial',
    assigned_to: 'Carlos Oliveira',
    due_date: '25/01/2024',
    days_until_due: '2',
    task_url: 'https://sistema.com/tarefas/456',
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  telegram: 'Telegram',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CHANNEL_PLACEHOLDERS: Record<string, string> = {
  email: 'exemplo@email.com',
  telegram: 'ID do Telegram (ex: 123456789)',
  sms: '+55 11 98765-4321',
  whatsapp: '+55 11 98765-4321',
};

export function TestNotificationModal({ open, onClose, template }: TestNotificationModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);

  const mockData = MOCK_DATA[template?.event_type] || {};
  
  const previewMessage = template?.template_body
    ? Object.entries(mockData).reduce(
        (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template.template_body
      )
    : '';

  const previewSubject = template?.template_subject
    ? Object.entries(mockData).reduce(
        (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template.template_subject
      )
    : '';

  const previewHtml = template?.template_html
    ? Object.entries(mockData).reduce(
        (text, [key, value]) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
        template.template_html
      )
    : '';

  const handleSendTest = async () => {
    if (!selectedChannel || !recipient) {
      toastWarning('Campos obrigatórios', 'Selecione um canal e informe o destinatário.');
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          template_id: template.id,
          event_type: template.event_type,
          channel: selectedChannel,
          recipient,
          variables: mockData,
          is_test: true,
        },
      });

      if (error) throw error;

      toastSuccess(
        'Teste enviado!', 
        `Notificação de teste enviada via ${CHANNEL_LABELS[selectedChannel]} para ${recipient}`
      );

      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar teste:', error);
      
      // Extract error message from various possible formats
      const errorMessage = error?.message || 
                          error?.details || 
                          error?.error?.message || 
                          'Não foi possível enviar a notificação de teste.';
      
      // Check if it's a WhatsApp number validation error
      if (errorMessage.includes('não possui WhatsApp') || errorMessage.includes('exists":false')) {
        toastError(
          'Número sem WhatsApp',
          'O número informado não possui WhatsApp ativo. Verifique o número e tente novamente.'
        );
      } else {
        toastError('Erro ao enviar teste', errorMessage);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testar Notificação</DialogTitle>
          <DialogDescription>
            Envie uma notificação de teste com dados fictícios para validar o template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="flex items-center gap-2">
              <span className="font-medium">{template?.name}</span>
              {template?.is_active && (
                <Badge variant="default" className="bg-green-500">
                  Ativo
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Canal de Envio *</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger id="channel">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                {template?.channels?.map((channel: string) => (
                  <SelectItem key={channel} value={channel}>
                    {CHANNEL_LABELS[channel] || channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedChannel && (
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinatário *</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={CHANNEL_PLACEHOLDERS[selectedChannel]}
              />
              {(selectedChannel === 'whatsapp' || selectedChannel === 'sms') && (
                <p className="text-xs text-muted-foreground">
                  Use formato internacional (E.164) sem o símbolo +. Ex.: 5511999999999
                </p>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview da Notificação</CardTitle>
              <CardDescription>
                Dados fictícios que serão usados no teste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewSubject && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assunto</Label>
                  <p className="font-medium">{previewSubject}</p>
                </div>
              )}
              
              {selectedChannel === 'email' && previewHtml ? (
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Texto</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-1 mt-4">
                    <Label className="text-xs text-muted-foreground">Mensagem (Texto)</Label>
                    <div className="rounded-md bg-muted p-4 whitespace-pre-wrap text-sm">
                      {previewMessage}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="html" className="space-y-1 mt-4">
                    <Label className="text-xs text-muted-foreground">Mensagem (HTML)</Label>
                    <div className="rounded-md border p-4 bg-background">
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mensagem</Label>
                  <div className="rounded-md bg-muted p-4 whitespace-pre-wrap text-sm">
                    {previewMessage}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Variáveis Disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(mockData).map((key) => (
                    <Badge key={key} variant="outline" className="font-mono text-xs">
                      {`{${key}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSendTest} disabled={sending || !selectedChannel || !recipient}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}