import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Globe, Calendar, Shield, Pencil, Trash2, MoreVertical, Circle } from 'lucide-react';
import { ClientNameCell } from '@/components/shared/ClientNameCell';
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
  is_cloudflare?: boolean;
  clients: {
    full_name: string | null;
    company_name: string | null;
    responsible_name: string | null;
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
  filters: {
    search: string;
    owner: string;
  };
}

export function DomainTable({ onEdit, currentPage, pageSize, sortColumn, sortDirection, onSort, filters }: DomainTableProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [currentPage, pageSize, sortColumn, sortDirection, filters]);

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
            client_type
          )
        `);

      // Apply filters
      if (filters.search) {
        query = query.ilike('domain', `%${filters.search}%`);
      }
      if (filters.owner !== 'all') {
        query = query.eq('owner', filters.owner as 'agency' | 'client');
      }

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
          const nameA = a.clients.responsible_name || (a.clients.client_type === 'company' ? a.clients.company_name : a.clients.full_name) || '';
          const nameB = b.clients.responsible_name || (b.clients.client_type === 'company' ? b.clients.company_name : b.clients.full_name) || '';
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
      <div className="space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
          <div className="col-span-3 cursor-pointer" onClick={() => onSort('client_id')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliente {sortColumn === 'client_id' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-3 cursor-pointer" onClick={() => onSort('domain')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Domínio {sortColumn === 'domain' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-3 cursor-pointer" onClick={() => onSort('expires_at')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Vencimento {sortColumn === 'expires_at' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => onSort('owner')}>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Proprietário {sortColumn === 'owner' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
          </div>
        </div>

        {/* Domain Rows as Cards */}
        {domains.map((domain, index) => (
          <Card 
            key={domain.id}
            className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              {/* Cliente */}
              <div className="col-span-3">
                <ClientNameCell client={domain.clients} />
              </div>

              {/* Domínio */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-medium text-foreground">{domain.domain}</span>
                  {domain.is_cloudflare && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Shield className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gerenciado pela Cloudflare</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* Vencimento */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] text-muted-foreground">
                    {format(parse(domain.expires_at, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy")}
                  </span>
                  {isExpired(domain.expires_at) && (
                    <Badge variant="default" className="bg-red-50 text-red-700 border-0 hover:bg-red-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
                      <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                      Vencido
                    </Badge>
                  )}
                  {!isExpired(domain.expires_at) && isExpiringSoon(domain.expires_at) && (
                    <Badge variant="default" className="bg-orange-50 text-orange-700 border-0 hover:bg-orange-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit">
                      <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />
                      Vence em breve
                    </Badge>
                  )}
                </div>
              </div>

              {/* Proprietário */}
              <div className="col-span-2">
                <Badge 
                  variant="default"
                  className={
                    domain.owner === 'agency' 
                      ? 'bg-amber-50 text-amber-700 border-0 hover:bg-amber-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit' 
                      : 'bg-blue-50 text-blue-700 border-0 hover:bg-blue-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                  }
                >
                  <Circle className={domain.owner === 'agency' ? 'h-2 w-2 fill-amber-500 text-amber-500' : 'h-2 w-2 fill-blue-500 text-blue-500'} />
                  {getOwnerLabel(domain.owner)}
                </Badge>
              </div>

              {/* Ações */}
              <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                    <DropdownMenuItem onClick={() => setEditingDomain(domain)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeletingDomain(domain)}
                      className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
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
