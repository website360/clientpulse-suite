import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PixQRCodeProps {
  receivableId: string;
  amount: number;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PixQRCode({ receivableId, amount, clientName, open, onOpenChange }: PixQRCodeProps) {
  const [copied, setCopied] = useState(false);

  // Fetch or generate PIX QR Code
  const { data: pixData, isLoading, refetch } = useQuery({
    queryKey: ["pix-qrcode", receivableId],
    queryFn: async () => {
      // Check if already has PIX payment in Asaas
      const { data: receivable } = await supabase
        .from("accounts_receivable")
        .select("asaas_payment_id")
        .eq("id", receivableId)
        .single();

      if (receivable?.asaas_payment_id) {
        // Fetch existing PIX data from Asaas
        const { data, error } = await supabase.functions.invoke("sync-asaas-payment", {
          body: { payment_id: receivable.asaas_payment_id },
        });

        if (error) throw error;
        return data;
      }

      // Create new PIX payment in Asaas
      const { data, error } = await supabase.functions.invoke("create-asaas-payment", {
        body: {
          receivable_id: receivableId,
          billing_type: "PIX",
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Check payment status
  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      if (!pixData?.payment_id) return;

      const { data, error } = await supabase.functions.invoke("sync-asaas-payment", {
        body: { payment_id: pixData.payment_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.status === "RECEIVED" || data?.status === "CONFIRMED") {
        toast.success("Pagamento confirmado!");
        onOpenChange(false);
      } else {
        toast.info("Pagamento ainda pendente");
      }
      refetch();
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento via PIX
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment details */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="font-bold text-lg">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={pixData?.status === "PENDING" ? "secondary" : "default"}>
                    {pixData?.status === "PENDING" ? "Aguardando" : pixData?.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            {pixData?.qr_code_image && (
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img 
                  src={pixData.qr_code_image} 
                  alt="QR Code PIX" 
                  className="w-64 h-64"
                />
              </div>
            )}

            {/* PIX Copy and Paste */}
            {pixData?.qr_code && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Código PIX (Copia e Cola)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.qr_code}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(pixData.qr_code)}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => checkStatusMutation.mutate()}
                disabled={checkStatusMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkStatusMutation.isPending ? 'animate-spin' : ''}`} />
                Verificar Status
              </Button>
              <Button
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>

            {/* Instructions */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  <strong>Como pagar:</strong><br />
                  1. Abra o app do seu banco<br />
                  2. Escolha a opção PIX &gt; Ler QR Code<br />
                  3. Ou copie o código PIX e cole no app
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
