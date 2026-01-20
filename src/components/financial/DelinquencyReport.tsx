import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Phone, Mail, MessageSquare, TrendingDown, Users, DollarSign } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export function DelinquencyReport() {
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Fetch overdue receivables
  const { data: overdueReceivables, isLoading } = useQuery({
    queryKey: ["overdue-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            email,
            phone,
            user_id
          )
        `)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Group by client
  const clientDelinquencies = overdueReceivables?.reduce((acc, item) => {
    const clientId = item.client_id;
    if (!clientId) return acc;

    if (!acc[clientId]) {
      acc[clientId] = {
        client: item.clients,
        items: [],
        totalAmount: 0,
        oldestDays: 0,
      };
    }

    acc[clientId].items.push(item);
    acc[clientId].totalAmount += item.amount || 0;
    
    const daysOverdue = differenceInDays(new Date(), new Date(item.due_date));
    if (daysOverdue > acc[clientId].oldestDays) {
      acc[clientId].oldestDays = daysOverdue;
    }

    return acc;
  }, {} as Record<string, any>);

  const delinquentClients = Object.values(clientDelinquencies || {});

  // Calculate summary stats
  const totalOverdue = overdueReceivables?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const totalClients = delinquentClients.length;
  const avgDaysOverdue = delinquentClients.length > 0
    ? delinquentClients.reduce((sum, c) => sum + c.oldestDays, 0) / delinquentClients.length
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSendReminder = async (clientId: string, method: "email" | "whatsapp") => {
    setSendingTo(clientId);
    
    try {
      const client = delinquentClients.find(c => c.client?.id === clientId);
      if (!client) return;

      // Call appropriate edge function
      const functionName = method === "email" ? "send-email" : "send-whatsapp";
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: {
          type: "payment_reminder",
          client_id: clientId,
          overdue_items: client.items,
        },
      });

      if (error) throw error;

      toast.success(`Lembrete enviado via ${method === "email" ? "e-mail" : "WhatsApp"}`);
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erro ao enviar lembrete");
    } finally {
      setSendingTo(null);
    }
  };

  if (isLoading) {
    return <div>Carregando relatório de inadimplência...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Relatório de Inadimplência</h2>
        <p className="text-sm text-muted-foreground">
          Clientes com pagamentos em atraso
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Total em Atraso</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueReceivables?.length || 0} títulos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Inadimplentes</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Com pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média de Atraso</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{Math.round(avgDaysOverdue)} dias</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio de inadimplência
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delinquent Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Inadimplentes</CardTitle>
          <CardDescription>
            Lista completa de clientes com pagamentos em atraso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delinquentClients.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum cliente inadimplente</p>
              <p className="text-sm text-muted-foreground">
                Todos os pagamentos estão em dia
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Títulos</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Maior Atraso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquentClients.map((delinquency) => (
                  <TableRow key={delinquency.client?.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {delinquency.client?.company_name || delinquency.client?.full_name}
                        </p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          {delinquency.client?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {delinquency.client.email}
                            </span>
                          )}
                          {delinquency.client?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {delinquency.client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{delinquency.items.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-destructive">
                        {formatCurrency(delinquency.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {delinquency.oldestDays} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {delinquency.client?.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(delinquency.client.id, "email")}
                            disabled={sendingTo === delinquency.client.id}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {delinquency.client?.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(delinquency.client.id, "whatsapp")}
                            disabled={sendingTo === delinquency.client.id}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
