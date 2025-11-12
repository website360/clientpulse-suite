import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle, XCircle } from 'lucide-react';

export function ZapierIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['zapier-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['zapier_enabled', 'zapier_webhook_url']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.zapier_enabled?.value === 'true');
      setWebhookUrl(settingsMap?.zapier_webhook_url?.value || '');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'zapier_enabled', value: isActive.toString(), is_active: true },
        { key: 'zapier_webhook_url', value: webhookUrl, is_active: true },
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
      queryClient.invalidateQueries({ queryKey: ['zapier-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do Zapier foram atualizadas.',
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Zapier</CardTitle>
              <CardDescription>
                Integrações customizadas com milhares de aplicativos
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
          <Label htmlFor="zapier-active">Ativar integração</Label>
          <Switch
            id="zapier-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {isActive && (
          <>
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Crie um Zap com trigger "Webhooks by Zapier" e cole a URL aqui
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Como usar:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Crie um novo Zap no Zapier</li>
                <li>Escolha "Webhooks by Zapier" como trigger</li>
                <li>Selecione "Catch Hook"</li>
                <li>Cole a URL fornecida aqui</li>
                <li>Configure as ações desejadas</li>
              </ol>
            </div>
          </>
        )}

        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}
