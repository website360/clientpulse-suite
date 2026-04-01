import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Code, Eye, Copy, Check } from 'lucide-react';
import { TEMPLATE_VARIABLES } from '@/data/defaultMessageTemplates';
import { cn } from '@/lib/utils';

interface MessageTemplateEditorProps {
  channel: 'text' | 'email' | 'whatsapp' | 'both';
  emailSubject?: string;
  emailHtml?: string;
  whatsappTemplate?: string;
  content?: string;
  onChannelChange: (channel: 'text' | 'email' | 'whatsapp' | 'both') => void;
  onEmailSubjectChange: (subject: string) => void;
  onEmailHtmlChange: (html: string) => void;
  onWhatsappTemplateChange: (template: string) => void;
  onContentChange: (content: string) => void;
}

export function MessageTemplateEditor({
  channel,
  emailSubject = '',
  emailHtml = '',
  whatsappTemplate = '',
  content = '',
  onChannelChange,
  onEmailSubjectChange,
  onEmailHtmlChange,
  onWhatsappTemplateChange,
  onContentChange,
}: MessageTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const getPreviewData = () => {
    return {
      client_name: 'João Silva',
      client_email: 'joao@exemplo.com',
      client_phone: '(11) 98765-4321',
      client_company: 'Empresa Exemplo Ltda',
      ticket_number: '12345',
      ticket_subject: 'Problema com acesso ao sistema',
      ticket_message: 'Não consigo acessar o sistema desde ontem. Aparece erro de autenticação.',
      ticket_status: 'Em Andamento',
      ticket_priority: 'Alta',
      ticket_url: 'https://sistema.exemplo.com/tickets/12345',
      ticket_opened_date: '01/04/2024 10:30',
      ticket_closed_date: '01/04/2024 15:45',
      resolution_time: '5 horas e 15 minutos',
      department_name: 'Suporte Técnico',
      department_email: 'suporte@exemplo.com',
      staff_name: 'Maria Santos',
      staff_email: 'maria@exemplo.com',
      reply_message: 'Olá! Identifiquei o problema e já corrigi. Por favor, tente acessar novamente.',
      reply_date: '01/04/2024 14:20',
      company_name: 'ClientPulse',
      company_email: 'contato@clientpulse.com',
      company_phone: '(11) 3000-0000',
      company_website: 'www.clientpulse.com',
      invoice_number: '2024-001',
      invoice_amount: '1.500,00',
      invoice_description: 'Plano Mensal - Abril 2024',
      due_date: '10/04/2024',
      days_until_due: '5',
      payment_url: 'https://sistema.exemplo.com/pagamento/2024-001',
      feedback_url: 'https://sistema.exemplo.com/feedback/12345',
    };
  };

  const replaceVariables = (text: string) => {
    const data = getPreviewData();
    let result = text;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Channel Selector */}
      <div className="space-y-2">
        <Label>Canal de Comunicação</Label>
        <Select value={channel} onValueChange={(value: any) => onChannelChange(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Texto Simples
              </div>
            </SelectItem>
            <SelectItem value="email">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (HTML)
              </div>
            </SelectItem>
            <SelectItem value="whatsapp">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                WhatsApp
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <MessageSquare className="h-4 w-4 text-green-600" />
                Email + WhatsApp
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Variables Helper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
          <CardDescription>Clique para copiar e usar nos templates</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="client">Cliente</TabsTrigger>
              <TabsTrigger value="ticket">Ticket</TabsTrigger>
              <TabsTrigger value="department">Depto</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="invoice">Fatura</TabsTrigger>
            </TabsList>
            {Object.entries(TEMPLATE_VARIABLES).map(([category, variables]) => (
              <TabsContent key={category} value={category} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {variables.map((variable) => (
                    <Button
                      key={variable.key}
                      variant="outline"
                      size="sm"
                      className="justify-between"
                      onClick={() => copyVariable(variable.key)}
                    >
                      <span className="text-xs font-mono">{variable.key}</span>
                      {copiedVar === variable.key ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Editors */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">
            <Code className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {/* Text/Simple Content */}
          {channel === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo da Mensagem</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Digite o conteúdo da mensagem..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Email Template */}
          {(channel === 'email' || channel === 'both') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email_subject">Assunto do Email</Label>
                <Input
                  id="email_subject"
                  value={emailSubject}
                  onChange={(e) => onEmailSubjectChange(e.target.value)}
                  placeholder="Ex: Ticket #{ticket_number} - {ticket_subject}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_html">Template HTML do Email</Label>
                <Textarea
                  id="email_html"
                  value={emailHtml}
                  onChange={(e) => onEmailHtmlChange(e.target.value)}
                  placeholder="Cole aqui o template HTML do email..."
                  rows={15}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* WhatsApp Template */}
          {(channel === 'whatsapp' || channel === 'both') && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp_template">Template WhatsApp</Label>
              <Textarea
                id="whatsapp_template"
                value={whatsappTemplate}
                onChange={(e) => onWhatsappTemplateChange(e.target.value)}
                placeholder="Digite o template para WhatsApp..."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use *negrito*, _itálico_, ~tachado~ e ```código``` para formatação
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {/* Email Preview */}
          {(channel === 'email' || channel === 'both') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>Preview do Email</CardTitle>
                </div>
                <CardDescription>
                  Assunto: {replaceVariables(emailSubject)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: replaceVariables(emailHtml) }}
                />
              </CardContent>
            </Card>
          )}

          {/* WhatsApp Preview */}
          {(channel === 'whatsapp' || channel === 'both') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <CardTitle>Preview do WhatsApp</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-[#e5ddd5] p-4 rounded-lg">
                  <div className="bg-white rounded-lg p-3 shadow-sm max-w-md">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {replaceVariables(whatsappTemplate)}
                    </pre>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Preview */}
          {channel === 'text' && (
            <Card>
              <CardHeader>
                <CardTitle>Preview da Mensagem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {replaceVariables(content)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
