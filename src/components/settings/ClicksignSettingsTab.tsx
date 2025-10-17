import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ClicksignSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isActive, setIsActive] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [webhookToken, setWebhookToken] = useState("");

  // Buscar configurações
  const { data: settings, isLoading } = useQuery({
    queryKey: ["clicksign-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clicksign_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsActive(data.is_active);
        setApiToken(data.api_token || "");
        setEnvironment(data.environment as "sandbox" | "production");
        setWebhookToken(data.webhook_token || "");
      }
      
      return data;
    },
  });

  // Salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const settingsData = {
        is_active: isActive,
        api_token: apiToken || null,
        environment,
        webhook_token: webhookToken || null,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("clicksign_settings")
          .update(settingsData)
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clicksign_settings")
          .insert([settingsData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clicksign-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações do Clicksign foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Testar conexão
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-clicksign-connection", {
        body: { api_token: apiToken, environment },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: "A conexão com o Clicksign foi estabelecida com sucesso.",
        });
      } else {
        toast({
          title: "Erro na conexão",
          description: data?.message || "Não foi possível conectar ao Clicksign.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao testar conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integração Clicksign</CardTitle>
          <CardDescription>
            Configure a integração com o Clicksign para envio de documentos para assinatura digital.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Integração</Label>
              <p className="text-sm text-muted-foreground">
                Habilite para usar o Clicksign no sistema
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {isActive && (
            <>
              <div className="space-y-2">
                <Label htmlFor="environment">Ambiente</Label>
                <Select value={environment} onValueChange={(value: "sandbox" | "production") => setEnvironment(value)}>
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Use Sandbox para testes e Produção para documentos reais
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-token">API Token</Label>
                <Input
                  id="api-token"
                  type="password"
                  placeholder="Digite o token da API Clicksign"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Token de acesso à API do Clicksign (obtenha em {environment === "sandbox" ? "sandbox." : ""}clicksign.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-token">Webhook Token (Opcional)</Label>
                <Input
                  id="webhook-token"
                  type="text"
                  placeholder="Token para validação de webhooks"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Token para validar requisições recebidas via webhook
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Configurações
                </Button>

                {apiToken && (
                  <Button
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : testConnectionMutation.isSuccess ? (
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    ) : testConnectionMutation.isError ? (
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    ) : null}
                    Testar Conexão
                  </Button>
                )}
              </div>
            </>
          )}

          {!isActive && (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              A integração com Clicksign está desativada. Ative acima para configurar.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Clicksign</CardTitle>
          <CardDescription>
            Informações sobre a integração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Como obter o API Token:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Acesse {environment === "sandbox" ? "sandbox.clicksign.com" : "clicksign.com"}</li>
              <li>Faça login na sua conta</li>
              <li>Vá em Configurações → Integrações → API</li>
              <li>Copie o token de acesso</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Funcionalidades:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Envio de contratos e propostas para assinatura</li>
              <li>Tracking de status das assinaturas</li>
              <li>Notificações automáticas via WhatsApp</li>
              <li>Geração automática de cobrança após assinatura</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}