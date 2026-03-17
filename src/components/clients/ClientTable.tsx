import { Eye, Pencil, Trash2, User, MoreVertical, UserX, UserCheck, Users, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { formatPhone, formatCpfCnpj } from '@/lib/masks';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TablePagination } from '@/components/ui/table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyClients } from '@/components/illustrations/EmptyClients';

interface ClientTableProps {
  clients: any[];
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (clientId: string) => void;
  onToggleStatus: (clientId: string, currentStatus: boolean) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ClientTable({ 
  clients, 
  onEdit, 
  onView, 
  onDelete,
  onToggleStatus,
  sortColumn,
  sortDirection,
  onSort,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: ClientTableProps) {

  if (clients.length === 0) {
    return (
      <Card className="card-elevated p-12 text-center">
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description="Comece adicionando seu primeiro cliente para começar a gerenciar relacionamentos."
          illustration={<EmptyClients />}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
        <div className="col-span-3 cursor-pointer" onClick={() => onSort('full_name')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort('client_type')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo {sortColumn === 'client_type' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('email')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('phone')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Telefone {sortColumn === 'phone' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-2 cursor-pointer" onClick={() => onSort('cpf_cnpj')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">CPF/CNPJ {sortColumn === 'cpf_cnpj' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 cursor-pointer" onClick={() => onSort('is_active')}>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status {sortColumn === 'is_active' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
        </div>
        <div className="col-span-1 text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
        </div>
      </div>

      {/* Client Rows as Cards */}
      {clients.map((client, index) => (
        <Card 
          key={client.id}
          onClick={() => onView(client)}
          className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group cursor-pointer"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
            {/* Cliente */}
            <div className="col-span-3">
              <ClientNameCell 
                client={client} 
                contactsCount={client.contacts_count?.[0]?.count || undefined}
              />
            </div>

            {/* Tipo */}
            <div className="col-span-1">
              <Badge variant="outline" className="text-[13px] border-0 whitespace-nowrap">
                {client.client_type === 'person' ? 'PF' : 'PJ'}
              </Badge>
            </div>

            {/* Email */}
            <div className="col-span-2">
              <p className="text-[14px] text-foreground truncate whitespace-nowrap">{client.email}</p>
            </div>

            {/* Telefone */}
            <div className="col-span-2">
              <p className="text-[14px] text-foreground whitespace-nowrap">{formatPhone(client.phone)}</p>
            </div>

            {/* CPF/CNPJ */}
            <div className="col-span-2">
              <p className="text-[14px] text-foreground whitespace-nowrap">{formatCpfCnpj(client.cpf_cnpj)}</p>
            </div>

            {/* Status */}
            <div className="col-span-1">
              <Badge
                variant={client.is_active ? 'default' : 'secondary'}
                className={client.is_active 
                  ? 'bg-green-50 text-green-700 border-0 hover:bg-green-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit' 
                  : 'bg-gray-100 text-gray-600 border-0 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                }
              >
                <Circle 
                  className={client.is_active ? 'h-2 w-2 fill-green-500 text-green-500' : 'h-2 w-2 fill-gray-400 text-gray-400'}
                />
                {client.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-end flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(client);
                    }}
                    className="rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(client);
                    }}
                    className="rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(client.id, client.is_active);
                    }}
                    className="rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    {client.is_active ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Inativar Cliente
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Ativar Cliente
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(client.id);
                    }}
                    className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Permanentemente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      ))}
      
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
