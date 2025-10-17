import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search } from "lucide-react";
import { DocumentGenerationModal } from "@/components/documents/DocumentGenerationModal";
import { GeneratedDocumentsTable } from "@/components/documents/GeneratedDocumentsTable";
import { useQuery } from "@tanstack/react-query";

export default function GeneratedDocuments() {
  const { toast } = useToast();
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: documents, refetch } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*, clients(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-for-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, company_name, nickname")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "signed" && doc.clicksign_status === "signed") ||
      (statusFilter === "pending" && (doc.clicksign_status === "pending" || !doc.clicksign_status)) ||
      (statusFilter === "paid" && doc.payment_status === "received");

    return matchesSearch && matchesStatus;
  });

  const handleSendToClicksign = async (docId: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-to-clicksign", {
        body: { document_id: docId },
      });

      if (error) throw error;

      toast({
        title: "Enviado para assinatura",
        description: "Documento enviado com sucesso para o Clicksign",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreatePayment = async (docId: string) => {
    // Implementar modal ou lógica para criar pagamento
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de cobrança em desenvolvimento",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documentos Gerados</h1>
            <p className="text-muted-foreground">
              Gerencie documentos, assinaturas e cobranças
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nickname || client.company_name || client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowGenerationModal(true)}
              disabled={!selectedClientId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os documentos gerados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por documento ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="signed">Assinados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <GeneratedDocumentsTable
              documents={filteredDocuments || []}
              onSendToClicksign={handleSendToClicksign}
              onCreatePayment={handleCreatePayment}
            />
          </CardContent>
        </Card>

        <DocumentGenerationModal
          open={showGenerationModal}
          onOpenChange={setShowGenerationModal}
          clientId={selectedClientId}
          onSuccess={() => {
            setShowGenerationModal(false);
            refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
