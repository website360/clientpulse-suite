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
import { Loader2, Save, TestTube, BookOpen, ExternalLink, CheckCircle2, AlertCircle, MessageSquare, Smartphone, RefreshCw, Bot, Copy, QrCode } from "lucide-react";
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
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { status: connectionStatus, checkStatus, isChecking } = useWhatsAppStatus(false);

  // Enquanto o QR estiver na tela, verifica o status a cada 5s para detectar a conexão.
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(() => checkStatus(true), 5000);
    return () => clearInterval(interval);
  }, [qrCode, checkStatus]);

  // Quando conectar, esconde o QR e avisa.
  useEffect(() => {
    if (connectionStatus === "connected" && qrCode) {
      setQrCode(null);
      setPairingCode(null);
      toast.success("WhatsApp conectado com sucesso! 🎉");
    }
  }, [connectionStatus, qrCode]);

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

      // Arma o bot na instância conectada: registra o webhook (evento MESSAGE) no
      // Evolution Go sem precisar reler o QR. Só faz sentido com o bot habilitado.
      let botRegistered = false;
      if (isActive && botEnabled && apiUrl && apiKey && instanceName) {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { action: "register_webhook" }
        });
        if (error) {
          console.warn("Webhook registration warning:", error.message);
        } else if (data?.registered) {
          botRegistered = true;
          console.log("Bot webhook registrado:", data);
        } else {
          console.warn("Webhook registration response:", data?.error || data);
        }
      }
      return { botRegistered };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      toast.success(
        result?.botRegistered
          ? "Configurações salvas! Bot ativo e recebendo mensagens."
          : "Configurações salvas!",
      );
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

  const getQrMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "get_qr" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success && data.qrcode) {
        setQrCode(data.qrcode);
        setPairingCode(data.pairingCode || null);
        toast.success("QR Code gerado! Escaneie com o WhatsApp do celular.");
      } else {
        toast.error("Não foi possível gerar o QR Code: " + (data?.error || "tente novamente"));
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar QR Code: " + error.message);
    },
  });

  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "create_instance", instance_name: instanceName }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.note ? "Instância já existe na Evolution." : "Instância criada na Evolution!");
      } else {
        toast.error("Falha ao criar instância: " + (data?.error || "verifique a Global API Key"));
      }
      checkStatus(true);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar instância: " + error.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "logout" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sessão encerrada. Gere um novo QR Code para conectar outro número.");
      setQrCode(null);
      setPairingCode(null);
      checkStatus(true);
    },
    onError: (error: Error) => {
      toast.error("Erro ao desconectar: " + error.message);
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

  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${webhookToken}`;
  const isConfigured = Boolean(apiUrl && apiKey && instanceName);

  const StatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
          </Badge>
        );
      case 'awaiting_qr':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
            <QrCode className="h-3 w-3 mr-1" /> Aguardando leitura do QR
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Verificando...
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" /> Desconectado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" /> Não verificado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== CONEXÃO / STATUS ===================== */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp (Evolution Go)
              </CardTitle>
              <CardDescription>
                Conexão e estado do número usado pelas automações e pelo bot de tickets.
              </CardDescription>
            </div>
            {isActive && isConfigured && (
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge />
                <Button size="sm" variant="outline" onClick={() => checkStatus(true)} disabled={isChecking}>
                  <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-base font-medium">Ativar integração WhatsApp</Label>
              <p className="text-sm text-muted-foreground">Liga o envio e recebimento de mensagens pelo WhatsApp.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Button size="sm" variant="outline" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isActive && !isConfigured && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configure as credenciais</AlertTitle>
              <AlertDescription>
                Abra <strong>"Credenciais da API"</strong> abaixo, preencha URL, instância e token, e salve.
              </AlertDescription>
            </Alert>
          )}

          {isActive && isConfigured && (
            <>
              {/* Banner explicativo conforme o estado real */}
              {connectionStatus === 'connected' && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Número conectado</AlertTitle>
                  <AlertDescription>
                    Tudo certo — as automações e o bot conseguem enviar mensagens. Para trocar de número, desconecte e leia um novo QR.
                  </AlertDescription>
                </Alert>
              )}
              {connectionStatus === 'awaiting_qr' && (
                <Alert className="border-amber-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Conectado ao servidor, mas sem número logado</AlertTitle>
                  <AlertDescription>
                    O servidor responde, mas <strong>nenhuma conta de WhatsApp está logada</strong> — por isso as mensagens não são entregues. Gere o QR Code e escaneie para parear o número.
                  </AlertDescription>
                </Alert>
              )}
              {connectionStatus === 'disconnected' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Desconectado</AlertTitle>
                  <AlertDescription>
                    Não foi possível falar com a instância. Verifique as credenciais ou gere o QR Code para conectar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Ações de conexão */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => getQrMutation.mutate()} disabled={getQrMutation.isPending}>
                  {getQrMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  {connectionStatus === 'connected' ? 'Trocar número (novo QR)' : 'Gerar QR Code'}
                </Button>
                {connectionStatus === 'connected' && (
                  <Button variant="outline" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                    {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Desconectar
                  </Button>
                )}
                <Button variant="outline" onClick={() => testConnectionMutation.mutate()} disabled={testConnectionMutation.isPending}>
                  {testConnectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                  Verificar status
                </Button>
              </div>

              {qrCode && (
                <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-white">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code do WhatsApp"
                    className="w-56 h-56"
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Aguardando leitura no celular...
                  </div>
                  {pairingCode && (
                    <p className="text-sm text-center">
                      Ou use o código de pareamento: <strong className="font-mono tracking-widest">{pairingCode}</strong>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    No celular: <strong>Aparelhos conectados → Conectar um aparelho</strong>. O QR expira em ~1 min; se falhar, gere outro.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ===================== SEÇÕES AVANÇADAS (ACCORDION) ===================== */}
      {isActive && (
        <Accordion type="multiple" defaultValue={isConfigured ? ["bot"] : ["credenciais"]} className="space-y-3">
          {/* Credenciais da API */}
          <AccordionItem value="credenciais" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4" /> Credenciais da API</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL da API</Label>
                <Input id="apiUrl" type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolution.seudominio.com" />
                <p className="text-xs text-muted-foreground">URL base da Evolution Go (sem barra no final).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância</Label>
                <Input id="instanceName" type="text" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="minha-instancia" />
                <p className="text-xs text-muted-foreground">Identificador da instância na Evolution Go.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Token da Instância</Label>
                <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Token único desta instância" />
                <p className="text-xs text-muted-foreground">Usado para enviar mensagens, ler QR e checar status.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="globalApiKey">Global API Key</Label>
                <Input id="globalApiKey" type="password" value={globalApiKey} onChange={(e) => setGlobalApiKey(e.target.value)} placeholder="GLOBAL_API_KEY do servidor" />
                <p className="text-xs text-muted-foreground">
                  <strong>Necessária para criar/recriar a instância pelo sistema</strong> (<code>GLOBAL_API_KEY</code> do .env da Evolution Go). Sem ela, só dá para criar a instância pelo painel do servidor.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar credenciais
                </Button>
                {isConfigured && (
                  <Button variant="outline" onClick={() => createInstanceMutation.mutate()} disabled={createInstanceMutation.isPending}>
                    {createInstanceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                    Criar instância
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bot de tickets */}
          <AccordionItem value="bot" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4" /> Bot de abertura de tickets
                {botEnabled && <Badge variant="outline" className="ml-1 text-emerald-600 border-emerald-500">ativo</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                O cliente abre chamados conversando pelo WhatsApp: o bot pergunta setor, assunto, problema e foto, registra o ticket e devolve o protocolo.
              </p>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="botEnabled" className="text-base font-medium">Ativar bot de tickets</Label>
                  <p className="text-sm text-muted-foreground">Mensagens recebidas iniciam o atendimento automático.</p>
                </div>
                <Switch id="botEnabled" checked={botEnabled} onCheckedChange={setBotEnabled} />
              </div>
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadastre no painel do Evolution Go como webhook de mensagens recebidas (evento <code>messages.upsert</code>). Salve antes de copiar.
                </p>
              </div>
              <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar bot
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Teste de envio */}
          {isConfigured && (
            <AccordionItem value="teste" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 font-medium"><TestTube className="h-4 w-4" /> Teste de envio</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Número de teste</Label>
                  <Input id="testPhone" type="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="5511999999999" />
                  <p className="text-xs text-muted-foreground">Formato internacional sem + (ex: 5511999999999).</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Mensagem</Label>
                  <Input id="testMessage" type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Olá! Esta é uma mensagem de teste." />
                </div>
                <Button onClick={() => sendTestMessageMutation.mutate()} disabled={sendTestMessageMutation.isPending || !testPhone || !testMessage}>
                  {sendTestMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Enviar mensagem de teste
                </Button>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}
    </div>
  );
}
