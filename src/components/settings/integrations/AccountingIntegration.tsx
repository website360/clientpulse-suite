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
import { FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function AccountingIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState('conta_azul');
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [spedEnabled, setSpedEnabled] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['accounting-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('key', ['accounting_enabled', 'accounting_platform', 'accounting_api_key', 'accounting_api_secret', 'sped_enabled']);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      setIsActive(settingsMap?.accounting_enabled?.value === 'true');
      setPlatform(settingsMap?.accounting_platform?.value || 'conta_azul');
      setApiKey(settingsMap?.accounting_api_key?.value || '');
      setApiSecret(settingsMap?.accounting_api_secret?.value || '');
      setSpedEnabled(settingsMap?.sped_enabled?.value === 'true');

      return settingsMap;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: 'accounting_enabled', value: isActive.toString(), is_active: true },
        { key: 'accounting_platform', value: platform, is_active: true },
        { key: 'accounting_api_key', value: apiKey, is_active: true },
        { key: 'accounting_api_secret', value: apiSecret, is_active: true },
        { key: 'sped_enabled', value: spedEnabled.toString(), is_active: true },
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
      queryClient.invalidateQueries({ queryKey: ['accounting-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de contabilidade foram atualizadas.',
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

  const handleExportSped = async () => {
    toast({
      title: 'Gerando SPED',
      description: 'Aguarde enquanto o arquivo é gerado...',
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-sped', {
        body: { 
          startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
          endDate: new Date().toISOString()
        }
      });

      if (error) throw error;

      // Download do arquivo
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SPED_${new Date().getFullYear()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'SPED gerado',
        description: 'O arquivo foi baixado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar SPED',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Integração Contábil</CardTitle>
                <CardDescription>
                  Exportação para sistemas de contabilidade
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
            <Label htmlFor="accounting-active">Ativar integração</Label>
            <Switch
              id="accounting-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {isActive && (
            <>
              <div>
                <Label htmlFor="platform">Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta_azul">Conta Azul</SelectItem>
                    <SelectItem value="omie">Omie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="api-key">API Key / Client ID</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Digite a API Key"
                />
              </div>

              <div>
                <Label htmlFor="api-secret">API Secret / Client Secret</Label>
                <Input
                  id="api-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Como configurar:</p>
                {platform === 'conta_azul' && (
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o Conta Azul</li>
                    <li>Vá em Configurações {'>'} Integrações</li>
                    <li>Crie uma nova aplicação</li>
                    <li>Copie o Client ID e Client Secret</li>
                  </ol>
                )}
                {platform === 'omie' && (
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o Omie</li>
                    <li>Vá em Configurações {'>'} API</li>
                    <li>Gere um App Key e App Secret</li>
                    <li>Cole os valores nos campos acima</li>
                  </ol>
                )}
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

      <Card>
        <CardHeader>
          <CardTitle>Geração de SPED</CardTitle>
          <CardDescription>
            Gere arquivos SPED Fiscal e Contábil para envio à Receita Federal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sped-enabled">Habilitar geração de SPED</Label>
            <Switch
              id="sped-enabled"
              checked={spedEnabled}
              onCheckedChange={setSpedEnabled}
            />
          </div>

          {spedEnabled && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Gere o arquivo SPED com base nos dados financeiros registrados no sistema.
                </p>
                
                <Button 
                  onClick={handleExportSped}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Gerar SPED do Ano Atual
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Informações importantes:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>O arquivo gerado inclui todas as movimentações do período</li>
                  <li>Revise o arquivo antes de enviar à Receita</li>
                  <li>Mantenha backup de todos os arquivos gerados</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
