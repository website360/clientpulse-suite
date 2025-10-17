import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Send, CreditCard, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  contractId?: string;
  onSuccess?: () => void;
}

export function DocumentGenerationModal({
  open,
  onOpenChange,
  clientId,
  contractId,
  onSuccess,
}: DocumentGenerationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null);
  
  // Payment fields
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentBillingType, setPaymentBillingType] = useState("BOLETO");

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(template);

    // Initialize variables with empty strings
    const templateVars = template.variables || [];
    const initialVars: Record<string, string> = {};
    templateVars.forEach((v: any) => {
      initialVars[v.key] = v.default_value || "";
    });
    setVariables(initialVars);
  };

  const handleGeneratePDF = async () => {
    if (!selectedTemplate || !clientId) {
      toast({
        title: "Erro",
        description: "Selecione um template e um cliente",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
        body: {
          template_id: selectedTemplate.id,
          client_id: clientId,
          contract_id: contractId,
          variables_data: variables,
        },
      });

      if (error) throw error;

      setGeneratedDocId(data.document_id);

      toast({
        title: "Documento gerado",
        description: "O documento foi gerado com sucesso!",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar documento",
        description: error.message || "Ocorreu um erro ao gerar o documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendToClicksign = async () => {
    if (!generatedDocId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-to-clicksign", {
        body: {
          document_id: generatedDocId,
        },
      });

      if (error) throw error;

      toast({
        title: "Enviado para assinatura",
        description: data.message || "Documento enviado com sucesso!",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error sending to Clicksign:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro ao enviar para assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!generatedDocId || !paymentAmount || !paymentDueDate) {
      toast({
        title: "Erro",
        description: "Preencha o valor e a data de vencimento",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-document-payment", {
        body: {
          document_id: generatedDocId,
          amount: parseFloat(paymentAmount),
          due_date: paymentDueDate,
          billing_type: paymentBillingType,
          description: `Pagamento - ${selectedTemplate?.name}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Cobrança criada",
        description: "A cobrança foi criada com sucesso no Asaas!",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Erro ao criar cobrança",
        description: error.message || "Erro ao criar cobrança",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Documento</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">
              <FileText className="h-4 w-4 mr-2" />
              Gerar
            </TabsTrigger>
            <TabsTrigger value="sign" disabled={!generatedDocId}>
              <Send className="h-4 w-4 mr-2" />
              Assinatura
            </TabsTrigger>
            <TabsTrigger value="payment" disabled={!generatedDocId}>
              <CreditCard className="h-4 w-4 mr-2" />
              Cobrança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                <div className="space-y-3">
                  <Label>Variáveis do Template</Label>
                  {(selectedTemplate.variables || []).map((variable: any) => (
                    <div key={variable.key}>
                      <Label htmlFor={variable.key} className="text-sm">
                        {variable.label}
                      </Label>
                      {variable.type === "textarea" ? (
                        <Textarea
                          id={variable.key}
                          value={variables[variable.key] || ""}
                          onChange={(e) =>
                            setVariables({ ...variables, [variable.key]: e.target.value })
                          }
                          placeholder={variable.placeholder}
                        />
                      ) : (
                        <Input
                          id={variable.key}
                          type={variable.type || "text"}
                          value={variables[variable.key] || ""}
                          onChange={(e) =>
                            setVariables({ ...variables, [variable.key]: e.target.value })
                          }
                          placeholder={variable.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={handleGeneratePDF} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Gerar Documento
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="sign" className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold">Enviar para Clicksign</h3>
              <p className="text-sm text-muted-foreground">
                O documento será enviado para o cliente assinar eletronicamente através do Clicksign.
              </p>
              <Button onClick={handleSendToClicksign} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para Assinatura
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={paymentBillingType} onValueChange={setPaymentBillingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreatePayment} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Criar Cobrança no Asaas
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
