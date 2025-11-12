import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, CheckCircle, XCircle, Send, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';

const emailSettingsSchema = z.object({
  smtpHost: z.string().trim().min(1, 'Host SMTP é obrigatório').max(255),
  smtpPort: z.string().trim().regex(/^\d+$/, 'Porta deve ser um número').refine(
    (val) => {
      const port = parseInt(val);
      return port > 0 && port <= 65535;
    },
    'Porta deve estar entre 1 e 65535'
  ),
  smtpUser: z.string().trim().min(1, 'Usuário SMTP é obrigatório').max(255),
  smtpPassword: z.string().min(1, 'Senha SMTP é obrigatória'),
  fromEmail: z.string().trim().email('Email inválido').max(255),
  fromName: z.string().trim().min(1, 'Nome do remetente é obrigatório').max(100),
});

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
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  const validateSettings = () => {
    setValidationErrors({});
    
    if (!isActive) {
      return true;
    }

    try {
      emailSettingsSchema.parse({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios corretamente.',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateSettings()) {
        throw new Error('Validação falhou');
      }

      const settingsToSave = [
        { key: 'email_enabled', value: isActive.toString(), is_active: isActive },
        { key: 'email_smtp_host', value: smtpHost.trim(), is_active: isActive },
        { key: 'email_smtp_port', value: smtpPort.trim(), is_active: isActive },
        { key: 'email_smtp_user', value: smtpUser.trim(), is_active: isActive },
        { key: 'email_smtp_password', value: smtpPassword, is_active: isActive },
        { key: 'email_from', value: fromEmail.trim(), is_active: isActive },
        { key: 'email_from_name', value: fromName.trim(), is_active: isActive },
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
    onSuccess: async () => {
      setValidationErrors({});
      await queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({
        title: 'Configurações salvas',
        description: isActive 
          ? 'A integração de email foi ativada com sucesso.' 
          : 'A integração de email foi desativada.',
      });
    },
    onError: (error) => {
      if (error.message !== 'Validação falhou') {
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar as configurações.',
          variant: 'destructive',
        });
      }
    }
  });

  const handleTestConnection = async () => {
    if (!validateSettings()) {
      return;
    }

    const port = parseInt(smtpPort.trim());
    
    // Aviso sobre porta 587
    if (port === 587) {
      toast({
        title: 'Aviso sobre porta 587',
        description: 'A porta 587 (STARTTLS) tem suporte limitado no teste de conexão. Recomendamos usar o teste de envio de email completo para validar.',
      });
    }

    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          smtpHost: smtpHost.trim(),
          smtpPort: port,
          smtpUser: smtpUser.trim(),
          smtpPassword: smtpPassword,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Conexão bem-sucedida',
          description: data.message || 'As credenciais SMTP estão corretas.',
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast({
        title: 'Erro na conexão',
        description: error.message || 'Não foi possível conectar ao servidor SMTP. Tente usar o teste de envio de email.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

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
            {Object.keys(validationErrors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Corrija os erros nos campos destacados abaixo.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">Host SMTP *</Label>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(e) => {
                    setSmtpHost(e.target.value);
                    setValidationErrors(prev => ({ ...prev, smtpHost: '' }));
                  }}
                  placeholder="smtp.gmail.com"
                  className={validationErrors.smtpHost ? 'border-destructive' : ''}
                />
                {validationErrors.smtpHost && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.smtpHost}</p>
                )}
              </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="smtp-port">Porta *</Label>
                {smtpPort === '587' && (
                  <Badge variant="outline" className="text-xs">
                    STARTTLS - teste limitado
                  </Badge>
                )}
              </div>
              <Input
                id="smtp-port"
                value={smtpPort}
                onChange={(e) => {
                  setSmtpPort(e.target.value);
                  setValidationErrors(prev => ({ ...prev, smtpPort: '' }));
                }}
                placeholder="587"
                className={validationErrors.smtpPort ? 'border-destructive' : ''}
              />
              {validationErrors.smtpPort && (
                <p className="text-sm text-destructive mt-1">{validationErrors.smtpPort}</p>
              )}
              {smtpPort === '587' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Porta 587 (STARTTLS) - Teste básico de conectividade. Use o teste de envio de email para validação completa.
                </p>
              )}
              {smtpPort === '465' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Porta 465 (SSL/TLS) - Conexão criptografada direta.
                </p>
              )}
              {smtpPort === '25' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Porta 25 - Conexão sem criptografia (não recomendado para produção).
                </p>
              )}
            </div>
            </div>

            <div>
              <Label htmlFor="smtp-user">Usuário SMTP *</Label>
              <Input
                id="smtp-user"
                value={smtpUser}
                onChange={(e) => {
                  setSmtpUser(e.target.value);
                  setValidationErrors(prev => ({ ...prev, smtpUser: '' }));
                }}
                placeholder="seu@email.com"
                className={validationErrors.smtpUser ? 'border-destructive' : ''}
              />
              {validationErrors.smtpUser && (
                <p className="text-sm text-destructive mt-1">{validationErrors.smtpUser}</p>
              )}
            </div>

            <div>
              <Label htmlFor="smtp-password">Senha SMTP *</Label>
              <Input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => {
                  setSmtpPassword(e.target.value);
                  setValidationErrors(prev => ({ ...prev, smtpPassword: '' }));
                }}
                placeholder="••••••••"
                className={validationErrors.smtpPassword ? 'border-destructive' : ''}
              />
              {validationErrors.smtpPassword && (
                <p className="text-sm text-destructive mt-1">{validationErrors.smtpPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="from-email">Email de envio *</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => {
                  setFromEmail(e.target.value);
                  setValidationErrors(prev => ({ ...prev, fromEmail: '' }));
                }}
                placeholder="noreply@suaempresa.com"
                className={validationErrors.fromEmail ? 'border-destructive' : ''}
              />
              {validationErrors.fromEmail && (
                <p className="text-sm text-destructive mt-1">{validationErrors.fromEmail}</p>
              )}
            </div>

            <div>
              <Label htmlFor="from-name">Nome do remetente *</Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => {
                  setFromName(e.target.value);
                  setValidationErrors(prev => ({ ...prev, fromName: '' }));
                }}
                placeholder="Sua Empresa"
                className={validationErrors.fromName ? 'border-destructive' : ''}
              />
              {validationErrors.fromName && (
                <p className="text-sm text-destructive mt-1">{validationErrors.fromName}</p>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2">
          {isActive && (
            <Button 
              onClick={handleTestConnection}
              disabled={isTestingConnection || saveMutation.isPending || isLoading}
              variant="outline"
            >
              {isTestingConnection ? 'Testando conexão...' : 'Testar Conexão'}
            </Button>
          )}
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

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
