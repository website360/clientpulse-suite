import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { Loader2 } from "lucide-react";

interface SendNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  period: number | null;
  onSuccess: () => void;
}

export function SendNotificationModal({
  open,
  onOpenChange,
  client,
  period,
  onSuccess,
}: SendNotificationModalProps) {
  const [paymentLink, setPaymentLink] = useState("");
  const [messagePreview, setMessagePreview] = useState("");
  const queryClient = useQueryClient();

  const { data: template } = useQuery({
    queryKey: ['payment-reminder-template', period],
    queryFn: async () => {
      if (!period) return null;
      
      const { data, error } = await supabase
        .from('payment_reminder_templates')
        .select('*')
        .eq('days_overdue', period)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!period && open,
  });

  useEffect(() => {
    if (template && client) {
      let preview = template.template_body;
      
      // Replace variables
      const clientName = client.client?.responsible_name || 
                        client.client?.company_name || 
                        client.client?.full_name || 
                        'Cliente';
      
      preview = preview.replace(/{cliente_nome}/g, clientName);
      preview = preview.replace(/{nome_cliente}/g, clientName);
      
      // Format invoices
      const invoiceList = client.overdue_items
        .map((item: any, idx: number) => 
          `${idx + 1}. ${item.description} - R$ ${Number(item.amount).toFixed(2)}`
        )
        .join('\n');
      
      preview = preview.replace(/{faturas}/g, invoiceList);
      preview = preview.replace(/{link_pagamento}/g, paymentLink || '[Link será inserido]');
      
      setMessagePreview(preview);
    }
  }, [template, client, paymentLink]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!client || !template) throw new Error("Dados incompletos");

      const phone = client.client?.phone;
      if (!phone) throw new Error("Cliente sem telefone cadastrado");

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'send_message',
          phone: phone,
          message: messagePreview,
        },
      });

      if (error) throw error;

      // Log the notification
      await supabase.from('payment_reminder_logs').insert({
        receivable_id: client.overdue_items[0]?.id,
        template_id: template.id,
        days_overdue: client.days_overdue,
        channel: 'whatsapp',
        recipient: phone,
        payment_link: paymentLink || null,
        status: 'sent',
      });
    },
    onSuccess: () => {
      showSuccess(
        'Notificação enviada!',
        'O lembrete foi enviado via WhatsApp com sucesso'
      );
      queryClient.invalidateQueries({ queryKey: ['payment-reminder-logs'] });
      setPaymentLink("");
      onSuccess();
    },
    onError: (error: any) => {
      showError('Erro ao enviar notificação', error.message);
    },
  });

  if (!client) return null;

  const clientName = client.client?.responsible_name || 
                     client.client?.company_name || 
                     client.client?.full_name || 
                     'Cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Notificação de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Cliente:</strong> {clientName}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Dias em atraso:</strong> {client.days_overdue}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Total devido:</strong> {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(client.total_amount)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-link">
              Link de Pagamento <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="payment-link"
              placeholder="https://..."
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Insira o link de pagamento se disponível. Para envios automáticos, deixe em branco.
            </p>
          </div>

          {template ? (
            <div className="space-y-2">
              <Label>Prévia da Mensagem</Label>
              <Textarea
                value={messagePreview}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          ) : (
            <div className="p-4 border border-yellow-500 bg-yellow-500/10 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ Nenhum template configurado para {period} dias de atraso.
                Configure um template em Configurações {'>'} Financeiro {'>'} Lembretes de Pagamento.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!template || sendMutation.isPending}
          >
            {sendMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enviar via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
