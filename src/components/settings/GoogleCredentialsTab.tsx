import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GoogleCredentialsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: `${window.location.origin}/settings`
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConfigured(true);
        setCredentials({
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          redirect_uri: data.redirect_uri || `${window.location.origin}/settings`
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Client ID e Client Secret',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from('google_calendar_settings')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('google_calendar_settings')
          .update({
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            redirect_uri: credentials.redirect_uri,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar nova
        const { error } = await supabase
          .from('google_calendar_settings')
          .insert({
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            redirect_uri: credentials.redirect_uri
          });

        if (error) throw error;
      }

      setIsConfigured(true);
      toast({
        title: 'Sucesso',
        description: 'Credenciais do Google Calendar salvas com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao salvar credenciais:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copiado!',
      description: 'Redirect URI copiado para a área de transferência'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credenciais do Google Calendar</CardTitle>
              <CardDescription>
                Configure as credenciais OAuth do Google Cloud Console
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Configurado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Não configurado</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Google Client ID *</Label>
            <Input
              id="client_id"
              type="text"
              placeholder="123456789-abc123.apps.googleusercontent.com"
              value={credentials.client_id}
              onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Google Client Secret *</Label>
            <Input
              id="client_secret"
              type="password"
              placeholder="GOCSPX-..."
              value={credentials.client_secret}
              onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirect_uri">Redirect URI</Label>
            <div className="flex gap-2">
              <Input
                id="redirect_uri"
                type="text"
                value={credentials.redirect_uri}
                onChange={(e) => setCredentials({ ...credentials, redirect_uri: e.target.value })}
                readOnly
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(credentials.redirect_uri)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este URI no Google Cloud Console
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Credenciais
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Obter as Credenciais</CardTitle>
          <CardDescription>
            Siga os passos abaixo para configurar o OAuth no Google Cloud Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                  Acesse o{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Crie um novo projeto ou selecione um existente</li>
                <li>
                  Vá para "APIs e serviços" → "Credenciais"
                </li>
                <li>
                  Clique em "Criar credenciais" → "ID do cliente OAuth 2.0"
                </li>
                <li>
                  Configure a tela de consentimento OAuth se necessário
                </li>
                <li>
                  Escolha "Aplicativo da Web" como tipo de aplicativo
                </li>
                <li>
                  Em "URIs de redirecionamento autorizados", adicione:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {credentials.redirect_uri}
                  </code>
                </li>
                <li>
                  Em "Origens JavaScript autorizadas", adicione:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {window.location.origin}
                  </code>
                </li>
                <li>
                  Clique em "Criar" e copie o Client ID e Client Secret
                </li>
                <li>
                  Ative a API do Google Calendar no projeto:
                  <br />
                  <a
                    href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Google Calendar API
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Cole as credenciais nos campos acima e salve</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Escopos necessários:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><code className="bg-muted px-2 py-0.5 rounded text-xs">https://www.googleapis.com/auth/calendar</code></li>
                <li><code className="bg-muted px-2 py-0.5 rounded text-xs">https://www.googleapis.com/auth/calendar.events</code></li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}