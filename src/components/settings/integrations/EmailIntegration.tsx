import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, CheckCircle, XCircle, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function EmailIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['email_enabled', 'email_smtp_host', 'email_smtp_port', 'email_smtp_user', 'email_smtp_password', 'email_from', 'email_from_name']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.email_enabled?.value === 'true');
      setSmtpHost(settingsMap?.email_smtp_host?.value || '');
      setSmtpPort(settingsMap?.email_smtp_port?.value || '');
      setSmtpUser(settingsMap?.email_smtp_user?.value || '');
      setSmtpPassword(settingsMap?.email_smtp_password?.value || '');
      setFromEmail(settingsMap?.email_from?.value || '');
      setFromName(settingsMap?.email_from_name?.value || '');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'email_enabled', value: isActive.toString(), is_active: true },
        { key: 'email_smtp_host', value: smtpHost, is_active: true },
        { key: 'email_smtp_port', value: smtpPort, is_active: true },
        { key: 'email_smtp_user', value: smtpUser, is_active: true },
        { key: 'email_smtp_password', value: smtpPassword, is_active: true },
        { key: 'email_from', value: fromEmail, is_active: true },
        { key: 'email_from_name', value: fromName, is_active: true },
      ];

      for (const setting of settingsToSave) {
        const exists = settings?.[setting.key];
        
        if (exists) {
          const { error } = await supabase
            .from('integration_settings')
            .update(setting)
            .eq('id', exists.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('integration_settings')
            .insert(setting);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de email foram atualizadas.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    }
  });

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite um email para teste.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Teste de Integração - Email',
          html: '<h1>Teste de Email</h1><p>Se você recebeu este email, a integração está funcionando corretamente!</p>',
          text: 'Teste de Email - Se você recebeu este email, a integração está funcionando corretamente!',
        }
      });

      if (error) throw error;

      toast({
        title: 'Email enviado',
        description: 'Verifique a caixa de entrada do email informado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Verifique as configurações e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Email (SMTP)</CardTitle>
              <CardDescription>
                Configure o envio de emails via SMTP para notificações e cobranças
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-active">Ativar integração</Label>
          <Switch
            id="email-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">Host SMTP</Label>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="smtp-user">Usuário SMTP</Label>
              <Input
                id="smtp-user"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="smtp-password">Senha SMTP</Label>
              <Input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="from-email">Email de envio</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@suaempresa.com"
              />
            </div>

            <div>
              <Label htmlFor="from-name">Nome do remetente</Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Sua Empresa"
              />
            </div>
          </>
        )}

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>

        {isActive && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label>Testar Integração</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@teste.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  onClick={handleTestEmail}
                  disabled={isTesting}
                  variant="outline"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isTesting ? 'Enviando...' : 'Testar'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
