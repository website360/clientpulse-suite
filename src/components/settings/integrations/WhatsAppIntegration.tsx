import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, TestTube, BookOpen, ExternalLink, CheckCircle2, AlertCircle, MessageSquare, Smartphone, RefreshCw, Bot, Copy } from "lucide-react";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pjnbsuwkxzxcfaetywjs.supabase.co";

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function WhatsAppIntegration() {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [globalApiKey, setGlobalApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [botEnabled, setBotEnabled] = useState(false);
  const [webhookToken, setWebhookToken] = useState("");

  const { status: connectionStatus, checkStatus, isChecking } = useWhatsAppStatus(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .in("key", [
          "whatsapp_enabled",
          "whatsapp_api_url",
          "whatsapp_api_key",
          "whatsapp_global_api_key",
          "whatsapp_instance_name",
          "whatsapp_bot_enabled",
          "whatsapp_webhook_token",
        ]);

      if (error) throw error;

      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      if (settingsMap) {
        const active = settingsMap.whatsapp_enabled?.value === "true";
        setIsActive(active);
        setApiUrl(settingsMap.whatsapp_api_url?.value || "");
        setApiKey(settingsMap.whatsapp_api_key?.value || "");
        setGlobalApiKey(settingsMap.whatsapp_global_api_key?.value || "");
        setInstanceName(settingsMap.whatsapp_instance_name?.value || "");
        setBotEnabled(settingsMap.whatsapp_bot_enabled?.value === "true");
        setWebhookToken(settingsMap.whatsapp_webhook_token?.value || randomToken());
      }

      return settingsMap;
    },
  });

  useEffect(() => {
    if (isActive && apiUrl && apiKey && instanceName) {
      checkStatus();
    }
  }, [isActive, apiUrl, apiKey, instanceName]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: "whatsapp_enabled", value: String(isActive), is_active: true },
        { key: "whatsapp_api_url", value: apiUrl, is_active: true },
        { key: "whatsapp_api_key", value: apiKey, is_active: true },
        { key: "whatsapp_global_api_key", value: globalApiKey, is_active: true },
        { key: "whatsapp_instance_name", value: instanceName, is_active: true },
        { key: "whatsapp_bot_enabled", value: String(botEnabled), is_active: true },
        { key: "whatsapp_webhook_token", value: webhookToken, is_active: true },
      ];

      for (const setting of settingsToSave) {
        const exists = settings?.[setting.key];
        
        if (exists) {
          const { error } = await supabase
            .from("integration_settings")
            .update(setting)
            .eq("id", exists.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("integration_settings")
            .insert(setting);
          if (error) throw error;
        }
      }

      // Auto-create instance on Evolution Go when enabled (idempotent — server returns "exists" if already there)
      if (isActive && apiUrl && apiKey && instanceName) {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { action: "create_instance", instance_name: instanceName }
        });
        if (error) {
          console.warn("Instance creation warning:", error.message);
        } else if (data?.success) {
          console.log("Instance created/verified on Evolution Go:", data);
        } else {
          console.warn("Instance creation response:", data?.error || data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      toast.success("Configurações salvas!");
      if (isActive && apiUrl && apiKey && instanceName) {
        checkStatus(true);
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "check_status" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Conexão OK! Status: ${data.status}`);
      } else {
        toast.error("Falha ao verificar status: " + data.error);
      }
      // Sincroniza o badge ignorando cache
      checkStatus(true);
    },
    onError: (error: Error) => {
      toast.error("Erro ao testar conexão: " + error.message);
      checkStatus(true);
    },
  });

  const sendTestMessageMutation = useMutation({
    mutationFn: async () => {
      if (!testPhone || !testMessage) {
        throw new Error("Preencha o número e a mensagem de teste");
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { 
          action: "send_message",
          phone: testPhone.replace(/\D/g, ''),
          message: testMessage 
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Mensagem de teste enviada com sucesso!");
        setTestPhone("");
        setTestMessage("");
      } else {
        toast.error("Falha ao enviar mensagem: " + data.error);
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Integração com WhatsApp via Evolution Go
              </CardTitle>
              <CardDescription>
                Configure sua VPS com Evolution Go para enviar mensagens automáticas pelo WhatsApp
              </CardDescription>
            </div>
            {isActive && (
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <Badge variant="default" className="bg-secondary text-primary hover:bg-secondary/80">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
                {connectionStatus === 'disconnected' && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
                {connectionStatus === 'checking' && (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verificando...
                  </Badge>
                )}
                {connectionStatus === 'unknown' && (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Não verificado
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkStatus(true)}
                  disabled={isChecking}
                >
                  <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-base font-medium">Ativar Integração WhatsApp</Label>
              <p className="text-sm text-muted-foreground">
                Ative para começar a enviar mensagens automáticas
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {isActive && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input
                  id="apiUrl"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.seudominio.com"
                />
                <p className="text-xs text-muted-foreground">
                  URL base da sua instalação Evolution Go (sem barra no final)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância</Label>
                <Input
                  id="instanceName"
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="minha-instancia"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador da instância criada na Evolution Go (campo <code>name</code> no /instance/create)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">Token da Instância</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Token único desta instância"
                />
                <p className="text-xs text-muted-foreground">
                  Token <code>apikey</code> desta instância — usado para enviar mensagens, ler QR e checar status.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="globalApiKey">Global API Key <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="globalApiKey"
                  type="password"
                  value={globalApiKey}
                  onChange={(e) => setGlobalApiKey(e.target.value)}
                  placeholder="GLOBAL_API_KEY do servidor"
                />
                <p className="text-xs text-muted-foreground">
                  Necessário apenas para criar/excluir instâncias remotamente (<code>GLOBAL_API_KEY</code> definido no .env do Evolution Go). Se vazio, usamos o Token da Instância como fallback.
                </p>
              </div>
            </>
          )}

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>

              {isActive && apiUrl && apiKey && instanceName && (
                <Button
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Verificar Status
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot de abertura de tickets
            </CardTitle>
            <CardDescription>
              Permite que o cliente abra chamados conversando pelo WhatsApp. O bot guia o cliente
              (setor, assunto, problema e foto), registra o ticket e devolve o número do protocolo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="botEnabled" className="text-base font-medium">Ativar bot de tickets</Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, mensagens recebidas no WhatsApp iniciam o atendimento automático.
                </p>
              </div>
              <Switch id="botEnabled" checked={botEnabled} onCheckedChange={setBotEnabled} />
            </div>

            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${webhookToken}`}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${webhookToken}`);
                    toast.success("URL copiada!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastre esta URL no painel do Evolution Go (webhook de mensagens recebidas / evento
                <code> messages.upsert</code>). Salve as configurações antes de copiar para garantir que o token está gravado.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Como ativar</AlertTitle>
              <AlertDescription className="text-sm">
                1. Ative o bot e clique em <strong>Salvar Configurações</strong>.<br />
                2. Copie a URL do Webhook acima.<br />
                3. No painel do Evolution Go, cadastre a URL como webhook de mensagens recebidas.<br />
                4. Mande "oi" pelo WhatsApp da instância para testar o fluxo.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {isActive && apiUrl && apiKey && instanceName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Teste de Envio
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para validar a integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testPhone">Número de Teste</Label>
              <Input
                id="testPhone"
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato internacional sem + (ex: 5511999999999)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testMessage">Mensagem de Teste</Label>
              <Input
                id="testMessage"
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Olá! Esta é uma mensagem de teste."
              />
            </div>

            <Button
              onClick={() => sendTestMessageMutation.mutate()}
              disabled={sendTestMessageMutation.isPending || !testPhone || !testMessage}
            >
              {sendTestMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Enviar Mensagem de Teste
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
