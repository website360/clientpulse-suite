import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, CheckCircle, XCircle, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function TelegramIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['telegram-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['telegram_enabled', 'telegram_bot_token', 'telegram_chat_id']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.telegram_enabled?.value === 'true');
      setBotToken(settingsMap?.telegram_bot_token?.value || '');
      setChatId(settingsMap?.telegram_chat_id?.value || '');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'telegram_enabled', value: isActive.toString(), is_active: true },
        { key: 'telegram_bot_token', value: botToken, is_active: true },
        { key: 'telegram_chat_id', value: chatId, is_active: true },
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
      queryClient.invalidateQueries({ queryKey: ['telegram-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do Telegram foram atualizadas.',
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

  const handleTestTelegram = async () => {
    const targetChatId = testChatId || chatId;
    
    if (!targetChatId) {
      toast({
        title: 'Chat ID obrigatório',
        description: 'Configure um Chat ID padrão ou digite um para teste.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-telegram', {
        body: {
          chat_id: targetChatId,
          message: '🔔 *Teste de Integração - Telegram*\n\nSe você recebeu esta mensagem, a integração está funcionando corretamente!',
          parse_mode: 'Markdown',
        }
      });

      if (error) throw error;

      toast({
        title: 'Mensagem enviada',
        description: 'Verifique o Telegram.',
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
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Telegram</CardTitle>
              <CardDescription>
                Alternativa ao WhatsApp para envio de notificações
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
          <Label htmlFor="telegram-active">Ativar integração</Label>
          <Switch
            id="telegram-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <>
            <div>
              <Label htmlFor="bot-token">Token do Bot</Label>
              <Input
                id="bot-token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Crie um bot usando o @BotFather no Telegram
              </p>
            </div>

            <div>
              <Label htmlFor="chat-id">Chat ID (opcional)</Label>
              <Input
                id="chat-id"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ID do grupo ou canal para notificações
              </p>
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
                  placeholder={chatId ? "Usar Chat ID padrão" : "Digite o Chat ID"}
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                />
                <Button
                  onClick={handleTestTelegram}
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
