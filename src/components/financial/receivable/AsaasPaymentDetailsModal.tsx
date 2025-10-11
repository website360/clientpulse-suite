import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AsaasPaymentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
}

export const AsaasPaymentDetailsModal = ({
  open,
  onOpenChange,
  account,
}: AsaasPaymentDetailsModalProps) => {
  const { toast } = useToast();

  if (!account) return null;

  const getAsaasStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDING': 'Pendente',
      'RECEIVED': 'Recebido',
      'CONFIRMED': 'Confirmado',
      'OVERDUE': 'Vencido',
      'REFUNDED': 'Reembolsado',
      'RECEIVED_IN_CASH': 'Recebido em dinheiro',
      'REFUND_REQUESTED': 'Reembolso solicitado',
      'CHARGEBACK_REQUESTED': 'Chargeback solicitado',
      'CHARGEBACK_DISPUTE': 'Disputa de chargeback',
      'AWAITING_CHARGEBACK_REVERSAL': 'Aguardando reversão',
      'DUNNING_REQUESTED': 'Cobrança solicitada',
      'DUNNING_RECEIVED': 'Cobrança recebida',
      'AWAITING_RISK_ANALYSIS': 'Análise de risco',
    };
    return labels[status] || status;
  };

  const getAsaasStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'RECEIVED' || status === 'CONFIRMED') return 'default';
    if (status === 'OVERDUE') return 'destructive';
    return 'secondary';
  };

  const getBillingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'BOLETO': 'Boleto',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'UNDEFINED': 'Não definido',
      'TRANSFER': 'Transferência',
      'DEPOSIT': 'Depósito',
      'PIX': 'PIX',
    };
    return labels[type] || type;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Cobrança no Asaas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status no Asaas</p>
              <Badge variant={getAsaasStatusVariant(account.asaas_status)}>
                {getAsaasStatusLabel(account.asaas_status)}
              </Badge>
            </div>
            {account.asaas_billing_type && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Forma de Pagamento</p>
                <p className="font-medium">{getBillingTypeLabel(account.asaas_billing_type)}</p>
              </div>
            )}
          </div>

          {/* Payment ID */}
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">ID da Cobrança</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                {account.asaas_payment_id}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(account.asaas_payment_id, 'ID da cobrança')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Customer ID */}
          {account.asaas_customer_id && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">ID do Cliente</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                  {account.asaas_customer_id}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(account.asaas_customer_id, 'ID do cliente')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Payment Confirmation Date */}
          {account.payment_confirmation_date && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Data de Confirmação</p>
              <p className="font-medium">
                {new Date(account.payment_confirmation_date).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          {/* Invoice URL */}
          {account.asaas_invoice_url && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Link da Fatura</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(account.asaas_invoice_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Fatura no Asaas
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
