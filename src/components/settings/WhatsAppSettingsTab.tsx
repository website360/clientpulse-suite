import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Save, TestTube, BookOpen, ExternalLink, CheckCircle2, AlertCircle, MessageSquare, Smartphone } from "lucide-react";

export function WhatsAppSettingsTab() {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .in("key", ["whatsapp_enabled", "whatsapp_api_url", "whatsapp_api_key", "whatsapp_instance_name"]);
      
      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, item: any) => {
        acc[item.key] = item;
        return acc;
      }, {});

      if (settingsMap) {
        setIsActive(settingsMap.whatsapp_enabled?.value === "true");
        setApiUrl(settingsMap.whatsapp_api_url?.value || "");
        setApiKey(settingsMap.whatsapp_api_key?.value || "");
        setInstanceName(settingsMap.whatsapp_instance_name?.value || "");
      }
      
      return settingsMap;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settingsToSave = [
        { key: "whatsapp_enabled", value: String(isActive), is_active: true },
        { key: "whatsapp_api_url", value: apiUrl, is_active: true },
        { key: "whatsapp_api_key", value: apiKey, is_active: true },
        { key: "whatsapp_instance_name", value: instanceName, is_active: true },
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      toast.success("Configurações salvas com sucesso!");
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
    },
    onError: (error: Error) => {
      toast.error("Erro ao testar conexão: " + error.message);
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Integração com WhatsApp via Evolution API
          </CardTitle>
          <CardDescription>
            Configure sua VPS com Evolution API para enviar mensagens automáticas pelo WhatsApp
          </CardDescription>
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
                  URL base da sua instalação Evolution API (sem barra no final)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key Global</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Sua chave de API global"
                />
                <p className="text-xs text-muted-foreground">
                  Chave de autenticação configurada no Evolution API
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
                  Nome da instância WhatsApp conectada no Evolution API
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

      {isActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Guia de Configuração</CardTitle>
            </div>
            <CardDescription>
              Siga este guia para configurar o Evolution API na sua VPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>1. Instalar Evolution API na VPS</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    O Evolution API é uma solução open-source para integração com WhatsApp:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse sua VPS via SSH</li>
                    <li>Instale Docker e Docker Compose</li>
                    <li>Clone o repositório: 
                      <code className="block mt-1 p-2 bg-muted rounded text-xs">
                        git clone https://github.com/EvolutionAPI/evolution-api.git
                      </code>
                    </li>
                    <li>Configure as variáveis de ambiente no arquivo .env</li>
                    <li>Execute: <code className="bg-muted px-2 py-1 rounded text-xs">docker-compose up -d</code></li>
                  </ol>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Para mais detalhes, consulte a <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">documentação oficial <ExternalLink className="h-3 w-3" /></a>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>2. Criar Instância WhatsApp</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Após instalar o Evolution API, você precisa criar uma instância:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse o painel do Evolution API (geralmente em http://seu-ip:8080)</li>
                    <li>Crie uma nova instância com um nome único</li>
                    <li>Escaneie o QR Code com seu WhatsApp</li>
                    <li>Aguarde a confirmação de conexão</li>
                    <li>Anote a API Key Global e o nome da instância</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>3. Configurar no Sistema</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Configure os dados no formulário acima:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>URL da API:</strong> O endereço público da sua VPS (ex: https://api.seudominio.com)</li>
                    <li><strong>API Key Global:</strong> A chave configurada no arquivo .env do Evolution API</li>
                    <li><strong>Nome da Instância:</strong> O nome da instância que você criou</li>
                  </ul>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Recomendamos usar HTTPS e um domínio próprio para maior segurança e confiabilidade.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>4. Testar a Integração</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Após configurar tudo, faça os testes:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Clique em "Verificar Status" para confirmar a conexão</li>
                    <li>Use o formulário de teste para enviar uma mensagem</li>
                    <li>Verifique se a mensagem chegou no WhatsApp de destino</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step5">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>5. Formato de Números</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    O sistema espera números no formato internacional:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <div>
                      <strong>Formato correto:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>Brasil: 5511999999999 (55 + DDD + número)</li>
                        <li>Sem espaços, hífens ou caracteres especiais</li>
                        <li>Sem o sinal de +</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Exemplos:</strong>
                      <ul className="ml-4 mt-1 space-y-1 text-xs">
                        <li>✓ 5511987654321</li>
                        <li>✓ 5521912345678</li>
                        <li>✗ +55 11 98765-4321</li>
                        <li>✗ (11) 98765-4321</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
