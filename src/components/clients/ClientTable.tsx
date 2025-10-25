import { Eye, Pencil, Trash2, User, MoreVertical, UserX, UserCheck } from 'lucide-react';
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
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
        <p className="text-muted-foreground">
          Comece adicionando seu primeiro cliente
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-0">
      <Card className="card-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                column="full_name"
                label="Cliente"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="client_type"
                label="Tipo"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="email"
                label="Email"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="phone"
                label="Telefone"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="cpf_cnpj"
                label="CPF/CNPJ"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="is_active"
                label="Status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableTableHead
                column="created_at"
                label="Ações"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="hover:bg-accent/50">
                <TableCell>
                  <ClientNameCell 
                    client={client} 
                    contactsCount={client.contacts_count?.[0]?.count || undefined}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {client.client_type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{client.email}</TableCell>
                <TableCell className="text-sm">{formatPhone(client.phone)}</TableCell>
                <TableCell className="text-sm">
                  {formatCpfCnpj(client.cpf_cnpj)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={client.is_active ? 'default' : 'secondary'}
                    className={client.is_active ? 'bg-success/10 text-success border-success/20' : ''}
                  >
                    {client.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(client)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleStatus(client.id, client.is_active)}>
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
                          onClick={() => onDelete(client.id)}
                          className="text-error focus:text-error"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Permanentemente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Card>
    </div>
  );
}
