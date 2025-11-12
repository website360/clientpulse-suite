import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Eye, EyeOff, AlertCircle, CheckCircle2, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HtmlSnippets } from './HtmlSnippets';
import { VisualEmailEditor } from './visual-editor/VisualEmailEditor';
import { BlockData } from './visual-editor/types';

interface NotificationTemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  template?: any;
}

const EVENT_TYPES = [
  { value: 'ticket_created', label: 'Ticket Criado' },
  { value: 'ticket_assigned', label: 'Ticket Atribuído' },
  { value: 'ticket_status_changed', label: 'Status do Ticket Alterado' },
  { value: 'ticket_message', label: 'Nova Mensagem no Ticket' },
  { value: 'ticket_response_admin', label: 'Ticket Respondido por Admin' },
  { value: 'ticket_response_client', label: 'Ticket Respondido por Cliente' },
  { value: 'ticket_resolved', label: 'Ticket Resolvido' },
  { value: 'ticket_closed', label: 'Ticket Fechado' },
  { value: 'ticket_reopened', label: 'Ticket Reaberto' },
  { value: 'payment_due', label: 'Cobrança Vencendo' },
  { value: 'payment_overdue', label: 'Cobrança Vencida' },
  { value: 'payment_received', label: 'Pagamento Recebido' },
  { value: 'contract_expiring', label: 'Contrato Vencendo' },
  { value: 'contract_expired', label: 'Contrato Vencido' },
  { value: 'domain_expiring', label: 'Domínio Vencendo' },
  { value: 'domain_expired', label: 'Domínio Vencido' },
  { value: 'maintenance_scheduled', label: 'Manutenção Agendada' },
  { value: 'maintenance_completed', label: 'Manutenção Concluída' },
  { value: 'task_assigned', label: 'Tarefa Atribuída' },
  { value: 'task_due', label: 'Tarefa Vencendo' },
  { value: 'custom', label: 'Personalizado' },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export function NotificationTemplateFormModal({ open, onClose, template }: NotificationTemplateFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [sendToClient, setSendToClient] = useState(true);
  const [sendToAdmins, setSendToAdmins] = useState(false);
  const [sendToAssigned, setSendToAssigned] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [htmlErrors, setHtmlErrors] = useState<string[]>([]);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setEventType(template.event_type || '');
      setChannels(template.channels || []);
      setTemplateSubject(template.template_subject || '');
      setTemplateBody(template.template_body || '');
      setTemplateHtml(template.template_html || '');
      setSendToClient(template.send_to_client ?? true);
      setSendToAdmins(template.send_to_admins ?? false);
      setSendToAssigned(template.send_to_assigned ?? false);
    } else {
      setName('');
      setDescription('');
      setEventType('');
      setChannels([]);
      setTemplateSubject('');
      setTemplateBody('');
      setTemplateHtml('');
      setSendToClient(true);
      setSendToAdmins(false);
      setSendToAssigned(false);
    }
  }, [template, open]);

  const validateHtml = (html: string): string[] => {
    if (!html.trim()) return [];
    
    const errors: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      errors.push('HTML contém erros de sintaxe');
    }
    
    // Check for unclosed tags
    const openTags = html.match(/<(\w+)[^>]*>/g) || [];
    const closeTags = html.match(/<\/(\w+)>/g) || [];
    const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
    
    openTags.forEach(tag => {
      const tagName = tag.match(/<(\w+)/)?.[1].toLowerCase();
      if (tagName && !selfClosingTags.includes(tagName)) {
        const openCount = (html.match(new RegExp(`<${tagName}[^>]*>`, 'gi')) || []).length;
        const closeCount = (html.match(new RegExp(`</${tagName}>`, 'gi')) || []).length;
        
        if (openCount !== closeCount) {
          errors.push(`Tag <${tagName}> pode estar sem fechamento`);
        }
      }
    });
    
    return [...new Set(errors)]; // Remove duplicates
  };

  const handleChannelToggle = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleHtmlChange = (value: string) => {
    setTemplateHtml(value);
    if (value.trim()) {
      const errors = validateHtml(value);
      setHtmlErrors(errors);
    } else {
      setHtmlErrors([]);
    }
  };

  const handleInsertSnippet = (code: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateHtml(prev => prev + '\n' + code);
      handleHtmlChange(templateHtml + '\n' + code);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = templateHtml;
    
    // Insert snippet at cursor position
    const newValue = currentValue.substring(0, start) + code + currentValue.substring(end);
    setTemplateHtml(newValue);
    handleHtmlChange(newValue);

    // Set cursor position after inserted snippet
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + code.length;
      textarea.focus();
    }, 0);
  };

  const handleSaveFromVisualEditor = (blocks: BlockData[], html: string) => {
    setTemplateHtml(html);
    handleHtmlChange(html);
    setShowVisualEditor(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !eventType || channels.length === 0 || !templateBody) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Validate HTML if provided
    if (templateHtml && htmlErrors.length > 0) {
      toast({
        title: 'Erros no HTML',
        description: 'Corrija os erros de sintaxe no template HTML antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const templateData = {
        name,
        description,
        event_type: eventType as any,
        channels: channels as any,
        template_subject: templateSubject,
        template_body: templateBody,
        template_html: templateHtml || null,
        send_to_client: sendToClient,
        send_to_admins: sendToAdmins,
        send_to_assigned: sendToAssigned,
        created_by: user?.id,
      };

      if (template) {
        const { error } = await supabase
          .from('notification_templates')
          .update(templateData)
          .eq('id', template.id);

        if (error) throw error;

        toast({
          title: 'Template atualizado',
          description: 'O template foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('notification_templates')
          .insert(templateData);

        if (error) throw error;

        toast({
          title: 'Template criado',
          description: 'O template foi criado com sucesso.',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            Configure o template de notificação que será enviado automaticamente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Novo Ticket Criado"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando este template será usado"
            />
          </div>

          <div>
            <Label htmlFor="event_type">Tipo de Evento *</Label>
            <Select value={eventType} onValueChange={setEventType} required>
              <SelectTrigger id="event_type">
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Canais de Envio *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {CHANNELS.map((channel) => (
                <div key={channel.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={channel.value}
                    checked={channels.includes(channel.value)}
                    onCheckedChange={() => handleChannelToggle(channel.value)}
                  />
                  <label
                    htmlFor={channel.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {channel.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Destinatários</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_to_client"
                  checked={sendToClient}
                  onCheckedChange={(checked) => setSendToClient(checked as boolean)}
                />
                <label htmlFor="send_to_client" className="text-sm">
                  Enviar para o Cliente
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_to_admins"
                  checked={sendToAdmins}
                  onCheckedChange={(checked) => setSendToAdmins(checked as boolean)}
                />
                <label htmlFor="send_to_admins" className="text-sm">
                  Enviar para Administradores
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_to_assigned"
                  checked={sendToAssigned}
                  onCheckedChange={(checked) => setSendToAssigned(checked as boolean)}
                />
                <label htmlFor="send_to_assigned" className="text-sm">
                  Enviar para o Responsável Atribuído
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="template_subject">Assunto (Email) *</Label>
            <Input
              id="template_subject"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder="Use {{variavel}} para valores dinâmicos"
              required={channels.includes('email')}
            />
          </div>

          <div>
            <Label htmlFor="template_body">Mensagem *</Label>
            <Textarea
              id="template_body"
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              placeholder="Digite a mensagem do template. Use {{variavel}} para valores dinâmicos."
              rows={10}
              required
            />
            <div className="flex items-start gap-2 mt-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Variáveis disponíveis (use entre chaves duplas):</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">{'{{client_name}}'}</Badge>
                  <Badge variant="secondary" className="text-xs">{'{{ticket_number}}'}</Badge>
                  <Badge variant="secondary" className="text-xs">{'{{subject}}'}</Badge>
                  <Badge variant="secondary" className="text-xs">{'{{amount}}'}</Badge>
                  <Badge variant="secondary" className="text-xs">{'{{due_date}}'}</Badge>
                </div>
              </div>
            </div>
          </div>

          {channels.includes('email') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="template_html">Template HTML (Email - Opcional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVisualEditor(true)}
                    className="h-8"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Editor Visual
                  </Button>
                  <HtmlSnippets onInsert={handleInsertSnippet} />
                  {templateHtml && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                      className="h-8"
                    >
                      {showHtmlPreview ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Ocultar Preview
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Preview
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              <Tabs value={showHtmlPreview ? "preview" : "editor"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="editor" onClick={() => setShowHtmlPreview(false)}>
                    Editor
                  </TabsTrigger>
                  <TabsTrigger value="preview" onClick={() => setShowHtmlPreview(true)} disabled={!templateHtml}>
                    Preview
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="editor" className="mt-2 space-y-2">
                  <Textarea
                    ref={textareaRef}
                    id="template_html"
                    value={templateHtml}
                    onChange={(e) => handleHtmlChange(e.target.value)}
                    placeholder="<html><body><h1>{{ticket_number}}</h1><p>{{client_name}}</p></body></html>"
                    className="min-h-[200px] font-mono text-sm"
                  />
                  
                  {templateHtml && (
                    <Alert variant={htmlErrors.length > 0 ? "destructive" : "default"} className="py-2">
                      {htmlErrors.length > 0 ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <strong>Erros encontrados:</strong>
                            <ul className="mt-1 ml-4 list-disc">
                              {htmlErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-sm">
                            HTML válido - nenhum erro de sintaxe detectado
                          </AlertDescription>
                        </>
                      )}
                    </Alert>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    HTML customizado para emails. Se não preenchido, será usado o corpo de mensagem acima com formatação básica.
                  </p>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-2">
                  <div className="border rounded-lg p-4 bg-background min-h-[200px] overflow-auto">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: templateHtml || '<p className="text-muted-foreground">Nenhum HTML para visualizar</p>' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview do template HTML. Variáveis como {'{{'} não serão substituídas na visualização.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : template ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Visual Editor Dialog */}
      <Dialog open={showVisualEditor} onOpenChange={setShowVisualEditor}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>Editor Visual de Email</DialogTitle>
            <DialogDescription>
              Arraste blocos da biblioteca e personalize seu template
            </DialogDescription>
          </DialogHeader>
          <VisualEmailEditor
            onSave={handleSaveFromVisualEditor}
            onCancel={() => setShowVisualEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
