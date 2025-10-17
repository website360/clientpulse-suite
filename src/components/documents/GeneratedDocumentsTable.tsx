import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Send, CreditCard, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GeneratedDocument {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
  clicksign_status?: string;
  clicksign_signed_url?: string;
  payment_status?: string;
  asaas_payment_id?: string;
  generated_pdf_url?: string;
  clients?: {
    full_name?: string;
    company_name?: string;
    nickname?: string;
  };
}

interface GeneratedDocumentsTableProps {
  documents: GeneratedDocument[];
  onSendToClicksign?: (docId: string) => void;
  onCreatePayment?: (docId: string) => void;
}

export function GeneratedDocumentsTable({
  documents,
  onSendToClicksign,
  onCreatePayment,
}: GeneratedDocumentsTableProps) {
  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusMap: Record<string, { label: string; variant: any }> = {
      draft: { label: "Rascunho", variant: "outline" },
      running: { label: "Aguardando", variant: "default" },
      signed: { label: "Assinado", variant: "success" },
      canceled: { label: "Cancelado", variant: "destructive" },
      pending: { label: "Pendente", variant: "default" },
      received: { label: "Pago", variant: "success" },
      overdue: { label: "Vencido", variant: "destructive" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" };

    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  const getClientName = (doc: GeneratedDocument) => {
    if (!doc.clients) return "—";
    return doc.clients.nickname || doc.clients.company_name || doc.clients.full_name || "—";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Assinatura</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum documento gerado
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.document_name}</TableCell>
                <TableCell>{getClientName(doc)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{doc.document_type}</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>{getStatusBadge(doc.clicksign_status)}</TableCell>
                <TableCell>{getStatusBadge(doc.payment_status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {doc.generated_pdf_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.generated_pdf_url, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {!doc.clicksign_status && onSendToClicksign && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendToClicksign(doc.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}

                    {doc.clicksign_signed_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.clicksign_signed_url, "_blank")}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}

                    {!doc.asaas_payment_id && onCreatePayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCreatePayment(doc.id)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
