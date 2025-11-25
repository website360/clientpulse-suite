import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Send, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReminderTemplate {
  id: string;
  name: string;
  description: string | null;
  days_overdue: number;
  channels: string[];
  template_subject: string | null;
  template_body: string;
  tone: 'friendly' | 'neutral' | 'firm' | 'urgent';
  is_active: boolean;
  include_payment_link: boolean;
  send_to_client: boolean;
  send_to_contacts: boolean;
}

const toneColors = {
  friendly: 'bg-green-500',
  neutral: 'bg-blue-500',
  firm: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const toneLabels = {
  friendly: 'Amigável',
  neutral: 'Neutro',
  firm: 'Firme',
  urgent: 'Urgente',
};

const availableVariables = [
  { var: '{{client_name}}', desc: 'Nome do cliente' },
  { var: '{{company_name}}', desc: 'Nome da empresa' },
  { var: '{{amount}}', desc: 'Valor formatado (R$ 1.500,00)' },
  { var: '{{description}}', desc: 'Descrição da cobrança' },
  { var: '{{due_date}}', desc: 'Data de vencimento' },
  { var: '{{days_overdue}}', desc: 'Dias em atraso' },
  { var: '{{payment_link}}', desc: 'Link de pagamento' },
];

export function PaymentReminderTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ReminderTemplate | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    days_overdue: number;
    channels: string[];
    template_subject: string;
    template_body: string;
    tone: 'friendly' | 'neutral' | 'firm' | 'urgent';
    is_active: boolean;
    include_payment_link: boolean;
    send_to_client: boolean;
    send_to_contacts: boolean;
  }>({
    name: '',
    description: '',
    days_overdue: 5,
    channels: ['email'],
    template_subject: '',
    template_body: '',
    tone: 'neutral',
    is_active: true,
    include_payment_link: true,
    send_to_client: true,
    send_to_contacts: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['payment-reminder-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_reminder_templates')
        .select('*')
        .order('days_overdue', { ascending: true });
      
      if (error) throw error;
      return data as ReminderTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('payment_reminder_templates')
          .update(data)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_reminder_templates')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminder-templates'] });
      showSuccess(
        selectedTemplate ? 'Template atualizado!' : 'Template criado!',
        'O template foi salvo com sucesso'
      );
      handleCloseModal();
    },
    onError: (error: any) => {
      showError('Erro ao salvar template', error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_reminder_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminder-templates'] });
      showSuccess('Template excluído!', 'O template foi removido com sucesso');
    },
    onError: (error: any) => {
      showError('Erro ao excluir template', error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (template: ReminderTemplate) => {
      // Aqui você pode implementar o envio de teste
      showSuccess('Teste enviado!', 'Verifique seu email/WhatsApp');
    },
  });

  const handleOpenModal = (template?: ReminderTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        days_overdue: template.days_overdue,
        channels: template.channels,
        template_subject: template.template_subject || '',
        template_body: template.template_body,
        tone: template.tone,
        is_active: template.is_active,
        include_payment_link: template.include_payment_link,
        send_to_client: template.send_to_client,
        send_to_contacts: template.send_to_contacts,
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        name: '',
        description: '',
        days_overdue: 5,
        channels: ['email'],
        template_subject: '',
        template_body: '',
        tone: 'neutral',
        is_active: true,
        include_payment_link: true,
        send_to_client: true,
        send_to_contacts: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const toggleChannel = (channel: string, enabled: boolean) => {
    if (enabled) {
      setFormData({ 
        ...formData, 
        channels: [...formData.channels, channel] 
      });
    } else {
      setFormData({ 
        ...formData, 
        channels: formData.channels.filter(c => c !== channel) 
      });
    }
  };

  const handleSave = () => {
    // Validação: pelo menos um canal deve estar selecionado
    if (formData.channels.length === 0) {
      showError('Erro de validação', 'Selecione pelo menos um canal de envio (Email ou WhatsApp)');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePreview = (template: ReminderTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const renderPreview = () => {
    if (!previewTemplate) return null;

    let message = previewTemplate.template_body;
    const mockVariables = {
      client_name: 'João Silva',
      company_name: 'Agência May',
      amount: 'R$ 1.500,00',
      description: 'Mensalidade de serviços - Janeiro/2025',
      due_date: '15/01/2025',
      days_overdue: previewTemplate.days_overdue.toString(),
      payment_link: 'https://pagamento.exemplo.com/abc123',
    };

    Object.entries(mockVariables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return (
      <div className="space-y-4">
        {previewTemplate.template_subject && (
          <div>
            <Label className="text-xs text-muted-foreground">Assunto do Email:</Label>
            <p className="font-medium">{previewTemplate.template_subject.replace(/{{(.*?)}}/g, (_, key) => mockVariables[key.trim() as keyof typeof mockVariables] || '')}</p>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground">Mensagem:</Label>
          <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
            {message}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div>Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Cobrança</h2>
          <p className="text-muted-foreground">
            Gerencie mensagens automáticas para cobranças em atraso
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Os lembretes são enviados automaticamente todos os dias às 9h para contas em atraso.
          Configure os templates com base nos dias de atraso.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <Badge className={toneColors[template.tone]}>
                  {toneLabels[template.tone]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Dias de atraso:</span>
                <Badge variant="outline">{template.days_overdue}+</Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {template.channels.map((channel) => (
                  <Badge key={channel} variant="secondary">
                    {channel === 'email' ? '📧 Email' : '📱 WhatsApp'}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePreview(template)}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Lembrete Amigável - 5 dias"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days_overdue">Dias de Atraso *</Label>
                <Input
                  id="days_overdue"
                  type="number"
                  min="0"
                  value={formData.days_overdue}
                  onChange={(e) => setFormData({ ...formData, days_overdue: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm font-medium">Canais de Envio *</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="channel_email" className="flex items-center gap-2 font-normal cursor-pointer">
                  📧 Enviar por Email
                </Label>
                <Switch
                  id="channel_email"
                  checked={formData.channels.includes('email')}
                  onCheckedChange={(checked) => toggleChannel('email', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="channel_whatsapp" className="flex items-center gap-2 font-normal cursor-pointer">
                  📱 Enviar por WhatsApp
                </Label>
                <Switch
                  id="channel_whatsapp"
                  checked={formData.channels.includes('whatsapp')}
                  onCheckedChange={(checked) => toggleChannel('whatsapp', checked)}
                />
              </div>
              {formData.channels.length === 0 && (
                <p className="text-xs text-destructive">
                  Selecione pelo menos um canal de envio
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tom da Mensagem</Label>
              <Select value={formData.tone} onValueChange={(value: any) => setFormData({ ...formData, tone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">😊 Amigável</SelectItem>
                  <SelectItem value="neutral">📋 Neutro</SelectItem>
                  <SelectItem value="firm">⚠️ Firme</SelectItem>
                  <SelectItem value="urgent">🚨 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_subject">Assunto do Email</Label>
              <Input
                id="template_subject"
                value={formData.template_subject}
                onChange={(e) => setFormData({ ...formData, template_subject: e.target.value })}
                placeholder="Ex: Lembrete: Pagamento pendente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_body">Mensagem *</Label>
              <Textarea
                id="template_body"
                value={formData.template_body}
                onChange={(e) => setFormData({ ...formData, template_body: e.target.value })}
                rows={10}
                placeholder="Digite a mensagem usando as variáveis disponíveis..."
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Variáveis disponíveis:</p>
                <div className="grid grid-cols-2 gap-1">
                  {availableVariables.map((v) => (
                    <div key={v.var}>
                      <code className="bg-muted px-1 rounded">{v.var}</code> - {v.desc}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Template ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_payment_link">Incluir link de pagamento</Label>
                <Switch
                  id="include_payment_link"
                  checked={formData.include_payment_link}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_payment_link: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="send_to_client">Enviar para cliente</Label>
                <Switch
                  id="send_to_client"
                  checked={formData.send_to_client}
                  onCheckedChange={(checked) => setFormData({ ...formData, send_to_client: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="send_to_contacts">Enviar para contatos</Label>
                <Switch
                  id="send_to_contacts"
                  checked={formData.send_to_contacts}
                  onCheckedChange={(checked) => setFormData({ ...formData, send_to_contacts: checked })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
          </DialogHeader>
          {renderPreview()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
