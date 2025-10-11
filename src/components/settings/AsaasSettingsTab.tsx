import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, TestTube } from "lucide-react";

export function AsaasSettingsTab() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [autoSync, setAutoSync] = useState(true);
  const [autoCreateOnReceivable, setAutoCreateOnReceivable] = useState(false);
  const [defaultBillingType, setDefaultBillingType] = useState("UNDEFINED");
  const [webhookToken, setWebhookToken] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["asaas-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_settings")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setEnvironment(data.environment as "sandbox" | "production");
        setAutoSync(data.auto_sync_payments);
        setAutoCreateOnReceivable(data.auto_create_on_receivable);
        setDefaultBillingType(data.default_billing_type);
        setWebhookToken(data.webhook_token || "");
      }
      
      return data;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!apiKey && !settings) {
        throw new Error("API Key é obrigatória");
      }

      const settingsData = {
        environment,
        auto_sync_payments: autoSync,
        auto_create_on_receivable: autoCreateOnReceivable,
        default_billing_type: defaultBillingType,
        webhook_token: webhookToken || null,
      };

      // Salvar a API key como secret
      if (apiKey) {
        const { error: secretError } = await supabase.functions.invoke("manage-asaas-secret", {
          body: { apiKey, environment },
        });
        if (secretError) throw secretError;
      }

      if (settings) {
        const { error } = await supabase
          .from("asaas_settings")
          .update(settingsData)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("asaas_settings")
          .insert(settingsData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asaas-settings"] });
      toast.success("Configurações salvas com sucesso!");
      setApiKey("");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-asaas-connection");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Conexão testada com sucesso! API Key válida.");
      } else {
        toast.error("Falha no teste de conexão: " + data.error);
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao testar conexão: " + error.message);
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
          <CardTitle>Configurações da API Asaas</CardTitle>
          <CardDescription>
            Configure sua integração com o Asaas. Use o ambiente sandbox para testes e production para cobranças reais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <Select value={environment} onValueChange={(value: "sandbox" | "production") => setEnvironment(value)}>
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                <SelectItem value="production">Production (Produção)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {environment === "sandbox" 
                ? "Modo de teste - nenhuma cobrança real será criada" 
                : "Modo produção - cobranças reais serão criadas"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key {settings ? "(deixe vazio para manter a atual)" : ""}</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings ? "••••••••••••••••" : "Cole sua API Key do Asaas"}
            />
            <p className="text-xs text-muted-foreground">
              Obtenha sua API Key em: Asaas → Integrações → API Key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookToken">Webhook Token (opcional)</Label>
            <Input
              id="webhookToken"
              type="text"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              placeholder="Token para validar webhooks"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoSync">Sincronização Automática</Label>
              <p className="text-xs text-muted-foreground">
                Sincronizar automaticamente status de pagamentos via webhook
              </p>
            </div>
            <Switch
              id="autoSync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoCreate">Criar no Asaas Automaticamente</Label>
              <p className="text-xs text-muted-foreground">
                Criar cobranças no Asaas ao criar contas a receber
              </p>
            </div>
            <Switch
              id="autoCreate"
              checked={autoCreateOnReceivable}
              onCheckedChange={setAutoCreateOnReceivable}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingType">Tipo de Cobrança Padrão</Label>
            <Select value={defaultBillingType} onValueChange={setDefaultBillingType}>
              <SelectTrigger id="billingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNDEFINED">Não Definido</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

            {settings && (
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
                Testar Conexão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
