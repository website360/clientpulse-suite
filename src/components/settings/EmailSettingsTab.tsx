import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, FileText, History, Send } from "lucide-react";
import { format } from "date-fns";

export default function EmailSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);

  // Fetch email settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch email templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch email logs
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // SMTP Settings Form State
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: settings?.smtp_host || '',
    smtp_port: settings?.smtp_port || 587,
    smtp_user: settings?.smtp_user || '',
    smtp_password: settings?.smtp_password || '',
    smtp_secure: settings?.smtp_secure ?? true,
    from_email: settings?.from_email || '',
    from_name: settings?.from_name || '',
    is_active: settings?.is_active ?? false,
  });

  // Update form when settings are loaded
  useState(() => {
    if (settings) {
      setSmtpForm({
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_password: settings.smtp_password,
        smtp_secure: settings.smtp_secure,
        from_email: settings.from_email,
        from_name: settings.from_name,
        is_active: settings.is_active,
      });
    }
  });

  // Save SMTP settings
  const saveSMTPMutation = useMutation({
    mutationFn: async () => {
      if (settings?.id) {
        const { error } = await supabase
          .from('email_settings')
          .update(smtpForm)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_settings')
          .insert([smtpForm]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({
        title: "Configurações salvas",
        description: "As configurações SMTP foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test SMTP connection
  const testConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          test: true,
          recipient: smtpForm.from_email,
        },
      });

      if (error) throw error;

      toast({
        title: "Teste realizado",
        description: data.success ? "Email de teste enviado com sucesso!" : "Falha no envio: " + data.error,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: template.subject,
          body_html: template.body_html,
          body_text: template.body_text,
          send_to_admin: template.send_to_admin,
          send_to_client: template.send_to_client,
          send_to_contact: template.send_to_contact,
          is_active: template.is_active,
        })
        .eq('id', template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      sent: "default",
      failed: "destructive",
      pending: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loadingSettings || loadingTemplates || loadingLogs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="smtp" className="space-y-6">
      <TabsList>
        <TabsTrigger value="smtp">
          <Mail className="w-4 h-4 mr-2" />
          Configuração SMTP
        </TabsTrigger>
        <TabsTrigger value="templates">
          <FileText className="w-4 h-4 mr-2" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="logs">
          <History className="w-4 h-4 mr-2" />
          Histórico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="smtp">
        <Card>
          <CardHeader>
            <CardTitle>Configuração SMTP</CardTitle>
            <CardDescription>
              Configure seu servidor SMTP para envio de emails (cPanel, Gmail, etc)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">Host SMTP</Label>
                <Input
                  id="smtp_host"
                  value={smtpForm.smtp_host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                  placeholder="mail.seudominio.com.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_port">Porta</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={smtpForm.smtp_port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_user">Usuário SMTP</Label>
              <Input
                id="smtp_user"
                value={smtpForm.smtp_user}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                placeholder="contato@seudominio.com.br"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">Senha SMTP</Label>
              <Input
                id="smtp_password"
                type="password"
                value={smtpForm.smtp_password}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smtp_secure"
                checked={smtpForm.smtp_secure}
                onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, smtp_secure: checked })}
              />
              <Label htmlFor="smtp_secure">Usar TLS/SSL</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_email">Email Remetente</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={smtpForm.from_email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                  placeholder="noreply@seudominio.com.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_name">Nome Remetente</Label>
                <Input
                  id="from_name"
                  value={smtpForm.from_name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                  placeholder="Sistema de Tickets"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={smtpForm.is_active}
                onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativar envio de emails</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                variant="outline"
                disabled={isTesting || !smtpForm.smtp_host || !smtpForm.from_email}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
              <Button
                onClick={() => saveSMTPMutation.mutate()}
                disabled={saveSMTPMutation.isPending}
              >
                {saveSMTPMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates">
        <div className="space-y-4">
          {templates?.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUpdate={(updated) => updateTemplateMutation.mutate(updated)}
              isUpdating={updateTemplateMutation.isPending}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Envios</CardTitle>
            <CardDescription>Últimos 50 emails enviados pelo sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{log.recipient_email}</TableCell>
                    <TableCell>{log.template_key}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum email enviado ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function TemplateCard({ template, onUpdate, isUpdating }: any) {
  const [formData, setFormData] = useState(template);

  const handleSave = () => {
    onUpdate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>Chave: {template.template_key}</CardDescription>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Enviar para:</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`admin-${template.id}`}
                checked={formData.send_to_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, send_to_admin: checked })}
              />
              <Label htmlFor={`admin-${template.id}`}>Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`client-${template.id}`}
                checked={formData.send_to_client}
                onCheckedChange={(checked) => setFormData({ ...formData, send_to_client: checked })}
              />
              <Label htmlFor={`client-${template.id}`}>Cliente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${template.id}`}
                checked={formData.send_to_contact}
                onCheckedChange={(checked) => setFormData({ ...formData, send_to_contact: checked })}
              />
              <Label htmlFor={`contact-${template.id}`}>Contato</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Assunto</Label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Ex: Ticket #{{ticket_number}} criado"
          />
          <p className="text-xs text-muted-foreground">
            Variáveis disponíveis: {`{{ticket_number}}, {{subject}}, {{client_name}}, {{status}}, {{priority}}, {{department}}`}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Corpo do Email (HTML)</Label>
          <Textarea
            value={formData.body_html}
            onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
            rows={8}
            placeholder="<html>...</html>"
          />
        </div>

        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar Template
        </Button>
      </CardContent>
    </Card>
  );
}
