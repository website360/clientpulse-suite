import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Globe, Calendar, User, Building2 } from 'lucide-react';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DomainFormModal } from './DomainFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Domain {
  id: string;
  domain: string;
  expires_at: string;
  owner: 'agency' | 'client';
  client_id: string;
  clients: {
    full_name: string | null;
    company_name: string | null;
    responsible_name: string | null;
    nickname: string | null;
    client_type: 'person' | 'company';
  };
}

interface DomainTableProps {
  onEdit?: () => void;
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export function DomainTable({ onEdit, currentPage, pageSize, sortColumn, sortDirection, onSort }: DomainTableProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [currentPage, pageSize, sortColumn, sortDirection]);

  const fetchDomains = async () => {
    try {
      let query = supabase
        .from('domains')
        .select(`
          *,
          clients (
            full_name,
            company_name,
            responsible_name,
            nickname,
            client_type
          )
        `);

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      }
      // When no sort column is selected, we'll sort client-side by client nickname

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort by client nickname when no specific column is selected
      let sortedData = (data as any) || [];
      if (!sortColumn) {
        sortedData = sortedData.sort((a: Domain, b: Domain) => {
          const nameA = a.clients.nickname || (a.clients.client_type === 'company' ? a.clients.company_name : a.clients.full_name) || '';
          const nameB = b.clients.nickname || (b.clients.client_type === 'company' ? b.clients.company_name : b.clients.full_name) || '';
          return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
        });
      }
      
      setDomains(sortedData);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Erro ao carregar domínios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDomain) return;

    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', deletingDomain.id);

      if (error) throw error;

      toast.success('Domínio excluído com sucesso!');
      fetchDomains();
      setDeletingDomain(null);
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Erro ao excluir domínio');
    }
  };

  const handleEditSuccess = () => {
    fetchDomains();
    setEditingDomain(null);
    onEdit?.();
  };

  const getOwnerLabel = (owner: 'agency' | 'client') => {
    return owner === 'agency' ? 'Agência' : 'Cliente';
  };

  const isExpiringSoon = (expiresAt: string) => {
    const exp = parse(expiresAt, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  const isExpired = (expiresAt: string) => {
    const exp = parse(expiresAt, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
  };

  if (loading) {
    return <div className="text-center py-8">Carregando domínios...</div>;
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border">
        <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum domínio cadastrado</h3>
        <p className="text-muted-foreground">
          Comece adicionando o primeiro domínio do seu cliente
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="client_id" label="Cliente" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="domain" label="Domínio" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="expires_at" label="Vencimento" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortableTableHead column="owner" label="Proprietário" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {domain.clients.client_type === 'company' ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {domain.clients.nickname || (domain.clients.client_type === 'company' ? domain.clients.company_name : domain.clients.full_name) || '-'}
                      </p>
                      {domain.clients.nickname && (
                        <p className="text-xs text-muted-foreground">
                          {domain.clients.client_type === 'company' 
                            ? domain.clients.company_name 
                            : domain.clients.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {domain.domain}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parse(domain.expires_at, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy")}
                    </span>
                    {isExpired(domain.expires_at) && (
                      <Badge variant="destructive">Vencido</Badge>
                    )}
                    {!isExpired(domain.expires_at) && isExpiringSoon(domain.expires_at) && (
                      <Badge variant="secondary" className="bg-warning/20 text-warning">
                        Vence em breve
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={domain.owner === 'agency' ? 'default' : 'secondary'}>
                    {getOwnerLabel(domain.owner)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDomain(domain)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingDomain(domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DomainFormModal
        isOpen={!!editingDomain}
        onClose={() => setEditingDomain(null)}
        onSuccess={handleEditSuccess}
        domain={editingDomain || undefined}
      />

      <AlertDialog open={!!deletingDomain} onOpenChange={() => setDeletingDomain(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o domínio "{deletingDomain?.domain}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
