import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, CheckCircle, XCircle, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function SMSIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [provider, setProvider] = useState('twilio');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['sms_enabled', 'sms_provider', 'sms_account_sid', 'sms_auth_token', 'sms_from_number']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.sms_enabled?.value === 'true');
      setProvider(settingsMap?.sms_provider?.value || 'twilio');
      setAccountSid(settingsMap?.sms_account_sid?.value || '');
      setAuthToken(settingsMap?.sms_auth_token?.value || '');
      setFromNumber(settingsMap?.sms_from_number?.value || '');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'sms_enabled', value: isActive.toString(), is_active: true },
        { key: 'sms_provider', value: provider, is_active: true },
        { key: 'sms_account_sid', value: accountSid, is_active: true },
        { key: 'sms_auth_token', value: authToken, is_active: true },
        { key: 'sms_from_number', value: fromNumber, is_active: true },
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
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de SMS foram atualizadas.',
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

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Digite um telefone para teste.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: testPhone,
          message: 'Teste de Integração - SMS: Se você recebeu esta mensagem, a integração está funcionando corretamente!',
        }
      });

      if (error) throw error;

      toast({
        title: 'SMS enviado',
        description: 'Verifique o telefone informado.',
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
            <Phone className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>SMS</CardTitle>
              <CardDescription>
                Envio de alertas críticos via SMS
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
          <Label htmlFor="sms-active">Ativar integração</Label>
          <Switch
            id="sms-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <>
            <div>
              <Label htmlFor="provider">Provedor</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="zenvia">Zenvia</SelectItem>
                  <SelectItem value="totalvoice">TotalVoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account-sid">Account SID / API Key</Label>
              <Input
                id="account-sid"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <Label htmlFor="auth-token">Auth Token / API Token</Label>
              <Input
                id="auth-token"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="from-number">Número de envio</Label>
              <Input
                id="from-number"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                placeholder="+5511999999999"
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
                  placeholder="+5511999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Button
                  onClick={handleTestSMS}
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
