import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { SendNotificationModal } from "@/components/financial/SendNotificationModal";
import { ClientNameCell } from "@/components/shared/ClientNameCell";

interface OverdueClient {
  id: string;
  client: any;
  overdue_items: any[];
  days_overdue: number;
  total_amount: number;
}

const OVERDUE_PERIODS = [
  { days: 3, label: "3 dias", color: "bg-yellow-500" },
  { days: 5, label: "5 dias", color: "bg-orange-500" },
  { days: 10, label: "10 dias", color: "bg-red-500" },
  { days: 20, label: "20 dias", color: "bg-red-600" },
  { days: 30, label: "30 dias", color: "bg-red-700" },
  { days: 60, label: "60 dias", color: "bg-purple-600" },
  { days: 90, label: "90 dias", color: "bg-purple-700" },
  { days: 120, label: "120 dias", color: "bg-purple-900" },
];

export default function PaymentNotifications() {
  const [selectedClient, setSelectedClient] = useState<OverdueClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: overdueClients, isLoading, refetch } = useQuery({
    queryKey: ['overdue-clients-by-period'],
    queryFn: async () => {
      const today = new Date();
      const { data: receivables, error } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('status', 'pending')
        .lt('due_date', today.toISOString());

      if (error) throw error;

      // Group by client and calculate days overdue
      const clientMap = new Map<string, OverdueClient>();

      receivables?.forEach((receivable) => {
        const dueDate = new Date(receivable.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!clientMap.has(receivable.client_id)) {
          clientMap.set(receivable.client_id, {
            id: receivable.client_id,
            client: receivable.client,
            overdue_items: [],
            days_overdue: daysOverdue,
            total_amount: 0,
          });
        }

        const client = clientMap.get(receivable.client_id)!;
        client.overdue_items.push(receivable);
        client.total_amount += Number(receivable.amount);
        
        // Use the maximum days overdue for this client
        if (daysOverdue > client.days_overdue) {
          client.days_overdue = daysOverdue;
        }
      });

      return Array.from(clientMap.values());
    },
  });

  const getClientsByPeriod = (days: number) => {
    if (!overdueClients) return [];
    
    const previousPeriodDays = OVERDUE_PERIODS.find(p => p.days > days)?.days || days + 1;
    
    return overdueClients.filter(client => {
      if (days === 3) {
        return client.days_overdue >= 3 && client.days_overdue < 5;
      }
      const periodIndex = OVERDUE_PERIODS.findIndex(p => p.days === days);
      const nextPeriod = OVERDUE_PERIODS[periodIndex + 1];
      
      return client.days_overdue >= days && (!nextPeriod || client.days_overdue < nextPeriod.days);
    });
  };

  const handleSendNotification = (client: OverdueClient, days: number) => {
    setSelectedClient(client);
    setSelectedPeriod(days);
    setModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notificações de Pagamento</h1>
            <p className="text-muted-foreground">
              Envie lembretes de pagamento para clientes em atraso
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Carregando clientes em atraso...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {OVERDUE_PERIODS.map((period) => {
              const clients = getClientsByPeriod(period.days);
              
              if (clients.length === 0) return null;

              return (
                <Card key={period.days}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${period.color}`} />
                        <span>Clientes em atraso há {period.label}</span>
                        <Badge variant="secondary">{clients.length}</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <ClientNameCell client={client.client} />
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-muted-foreground">
                                {client.overdue_items.length} fatura{client.overdue_items.length > 1 ? 's' : ''}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(client.total_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              {client.days_overdue} dias
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleSendNotification(client, period.days)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {OVERDUE_PERIODS.every(period => getClientsByPeriod(period.days).length === 0) && (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum cliente em atraso
                  </h3>
                  <p className="text-muted-foreground">
                    Não há clientes com pagamentos pendentes no momento
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <SendNotificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        client={selectedClient}
        period={selectedPeriod}
        onSuccess={() => {
          refetch();
          setModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
