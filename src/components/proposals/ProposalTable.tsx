import { useState } from 'react';
import { Eye, Edit, Trash2, Send, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Proposal {
  id: string;
  title: string;
  client_id: string;
  status: string;
  validity_days: number;
  created_at: string;
  clients?: {
    company_name: string | null;
    full_name: string | null;
  };
  proposal_services?: Array<{
    quantity: number;
    unit_price: number;
  }>;
}

interface ProposalTableProps {
  proposals: Proposal[];
  onView: (proposal: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
  onDelete: (id: string) => void;
  onSend: (proposal: Proposal) => void;
  onDownload: (proposal: Proposal) => void;
}

const statusColors = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  viewed: 'bg-yellow-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-gray-400',
};

const statusLabels = {
  draft: 'Rascunho',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  expired: 'Expirada',
};

export function ProposalTable({
  proposals,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownload,
}: ProposalTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                Nenhuma proposta encontrada
              </TableCell>
            </TableRow>
          ) : (
            proposals.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell className="font-medium">
                  {proposal.title}
                </TableCell>
                <TableCell>
                  {proposal.clients?.company_name || proposal.clients?.full_name || '-'}
                </TableCell>
                <TableCell>
                  {proposal.validity_days} dias
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[proposal.status as keyof typeof statusColors]}>
                    {statusLabels[proposal.status as keyof typeof statusLabels]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(proposal.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(proposal)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(proposal)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {proposal.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onSend(proposal)}>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(proposal)}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(proposal.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
