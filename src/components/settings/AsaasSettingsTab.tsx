import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Save, TestTube, BookOpen, ExternalLink, CheckCircle2, AlertCircle, Key } from "lucide-react";

export function AsaasSettingsTab() {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
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
        setIsActive((data as any).is_active ?? false);
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
      const settingsData = {
        is_active: isActive,
        environment,
        auto_sync_payments: autoSync,
        auto_create_on_receivable: autoCreateOnReceivable,
        default_billing_type: defaultBillingType,
        webhook_token: webhookToken || null,
      };

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
          <CardTitle>Integração com Asaas</CardTitle>
          <CardDescription>
            Ative ou desative a integração com o Asaas. Quando desativada, o sistema funciona normalmente sem sincronização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-base font-medium">Ativar Integração com Asaas</Label>
              <p className="text-sm text-muted-foreground">
                Desative para usar o sistema financeiro sem sincronização com Asaas
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
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  A API Key do Asaas precisa ser configurada como um secret do Supabase para garantir segurança. 
                  Use a seção abaixo para configurá-la.
                </AlertDescription>
              </Alert>

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

              {settings && isActive && (
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

            {isActive && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Configurar API Key do Asaas
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  A API Key precisa ser armazenada de forma segura no Supabase. Clique no botão abaixo para acessar a página de configuração e adicionar o secret.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => window.open('https://supabase.com/dashboard/project/pjnbsuwkxzxcfaetywjs/settings/functions', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configurar Secret no Supabase
                </Button>
                <div className="mt-3 p-3 bg-background rounded border">
                  <p className="text-xs font-medium mb-1">Nome do secret:</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">ASAAS_API_KEY</code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Copie sua API Key do Asaas e cole como valor do secret.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Guia de Configuração</CardTitle>
            </div>
            <CardDescription>
              Siga este guia passo a passo para configurar e usar a integração com Asaas
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step1">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>1. Criar conta no Asaas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Se você ainda não tem uma conta no Asaas, crie uma gratuitamente:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Acesse <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">www.asaas.com <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Clique em "Criar conta grátis"</li>
                  <li>Preencha seus dados e confirme seu email</li>
                  <li>Complete o cadastro da sua empresa</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>2. Obter API Key</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A API Key é necessária para conectar o sistema ao Asaas:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Faça login no <a href="https://www.asaas.com/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">painel Asaas <ExternalLink className="h-3 w-3" /></a></li>
                  <li>No menu lateral, vá em <strong>Integrações</strong> → <strong>API Key</strong></li>
                  <li>Clique em <strong>Gerar nova chave</strong></li>
                  <li>Escolha o ambiente:
                    <ul className="ml-6 mt-1 space-y-1">
                      <li><strong>Sandbox:</strong> Para testes (recomendado inicialmente)</li>
                      <li><strong>Production:</strong> Para cobranças reais</li>
                    </ul>
                  </li>
                  <li>Copie a API Key gerada (ela só será exibida uma vez)</li>
                  <li>Cole a API Key no campo acima e salve</li>
                </ol>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription className="text-sm">
                    Guarde sua API Key em um local seguro. Ela não poderá ser visualizada novamente no painel do Asaas.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>3. Configurar Webhook (Opcional)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configure o webhook para sincronizar automaticamente o status dos pagamentos:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>No painel Asaas, vá em <strong>Integrações</strong> → <strong>Webhooks</strong></li>
                  <li>Clique em <strong>Adicionar webhook</strong></li>
                  <li>Configure os seguintes dados:</li>
                </ol>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div>
                    <strong>URL do Webhook:</strong>
                    <code className="block mt-1 p-2 bg-background rounded text-xs break-all">
                      https://pjnbsuwkxzxcfaetywjs.supabase.co/functions/v1/asaas-webhook
                    </code>
                  </div>
                  <div>
                    <strong>Eventos para notificar:</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>✓ Cobrança recebida (PAYMENT_RECEIVED)</li>
                      <li>✓ Cobrança confirmada (PAYMENT_CONFIRMED)</li>
                      <li>✓ Cobrança vencida (PAYMENT_OVERDUE)</li>
                      <li>✓ Cobrança excluída (PAYMENT_DELETED)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Token de Acesso (opcional):</strong>
                    <p className="text-muted-foreground mt-1">
                      Crie um token personalizado (ex: meu-token-secreto-123) e configure o mesmo no campo "Webhook Token" acima para maior segurança.
                    </p>
                  </div>
                </div>
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
                  Após configurar, teste se tudo está funcionando:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Clique no botão <strong>"Testar Conexão"</strong> acima</li>
                  <li>Se aparecer uma mensagem de sucesso, sua API Key está válida</li>
                  <li>Vá em <strong>Contas a Receber</strong> e crie uma nova conta</li>
                  <li>Marque a opção <strong>"Criar automaticamente no Asaas"</strong></li>
                  <li>Após salvar, verifique se a cobrança aparece no painel do Asaas</li>
                </ol>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Modo Sandbox:</strong> No ambiente de testes, você pode simular pagamentos sem cobranças reais. Perfeito para validar a integração antes de usar em produção.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step5">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>5. Como Usar no Dia a Dia</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm font-medium">Criando cobranças:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ao criar uma conta a receber, marque "Criar automaticamente no Asaas"</li>
                  <li>O cliente será criado automaticamente no Asaas se ainda não existir</li>
                  <li>A cobrança será gerada com link de pagamento</li>
                </ul>

                <p className="text-sm font-medium mt-4">Gerenciando cobranças existentes:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Criar no Asaas:</strong> Para contas que ainda não foram sincronizadas</li>
                  <li><strong>Sincronizar Status:</strong> Atualiza o status da cobrança do Asaas</li>
                  <li><strong>Ver Fatura:</strong> Abre o link da fatura no Asaas</li>
                  <li><strong>Detalhes Asaas:</strong> Mostra informações completas da cobrança</li>
                </ul>

                <p className="text-sm font-medium mt-4">Acompanhamento automático:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Com webhook configurado, o status é atualizado automaticamente</li>
                  <li>Quando um pagamento for confirmado no Asaas, a conta aqui será marcada como "Recebido"</li>
                  <li>Cobranças vencidas são atualizadas automaticamente para "Vencido"</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step6">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span>6. Migrando para Produção</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription className="text-sm">
                    No ambiente de produção, todas as cobranças serão REAIS. Certifique-se de testar tudo no sandbox antes.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground mt-4">
                  Quando estiver pronto para usar em produção:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Gere uma nova API Key no ambiente <strong>Production</strong> do Asaas</li>
                  <li>Altere o ambiente acima para <strong>"Production (Produção)"</strong></li>
                  <li>Cole a nova API Key de produção</li>
                  <li>Atualize a URL do webhook no painel Asaas (mesma URL, mas com a API Key de produção)</li>
                  <li>Teste criando uma cobrança de teste pequena</li>
                  <li>Verifique se tudo está funcionando corretamente</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
