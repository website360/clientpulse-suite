import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePaginationSort } from '@/hooks/usePaginationSort';
import { TablePagination } from '@/components/ui/table-pagination';
import { Skeleton } from '@/components/ui/skeleton';

export function ApprovalsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
  } = usePaginationSort('created_at', 'desc');

  // Fetch approvals with filters
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', statusFilter, clientFilter, projectFilter, searchTerm, currentPage, pageSize, sortColumn, sortDirection],
    queryFn: async () => {
      let query = supabase
        .from('project_stage_approvals')
        .select(`
          *,
          project_stages (
            id,
            title,
            projects (
              id,
              name,
              clients (
                id,
                full_name,
                company_name,
                client_type
              )
            )
          ),
          profiles:requested_by (
            full_name
          )
        `)
        .order(sortColumn || 'created_at', { ascending: sortDirection === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (clientFilter) {
        query = query.eq('project_stages.projects.client_id', clientFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { data: data || [], count: count || 0 };
    },
  });

  // Fetch metrics
  const { data: metrics } = useQuery({
    queryKey: ['approval-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_approvals')
        .select('status, approved_at, created_at');

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(a => a.status === 'pending').length || 0;
      const approved = data?.filter(a => a.status === 'approved').length || 0;
      const rejected = data?.filter(a => a.status === 'rejected').length || 0;

      // Calculate average approval time
      const approvedItems = data?.filter(a => a.approved_at) || [];
      const totalTime = approvedItems.reduce((sum, item) => {
        const diff = new Date(item.approved_at!).getTime() - new Date(item.created_at).getTime();
        return sum + diff;
      }, 0);
      const avgTime = approvedItems.length > 0 ? totalTime / approvedItems.length : 0;
      const avgDays = Math.round(avgTime / (1000 * 60 * 60 * 24));

      return {
        total,
        pending,
        approved,
        rejected,
        avgDays,
      };
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline', icon: Clock, className: 'text-yellow-600' },
      approved: { variant: 'default', icon: CheckCircle, className: 'text-green-600' },
      rejected: { variant: 'destructive', icon: XCircle, className: 'text-red-600' },
      changes_requested: { variant: 'secondary', icon: Filter, className: 'text-orange-600' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {status === 'pending' && 'Pendente'}
        {status === 'approved' && 'Aprovado'}
        {status === 'rejected' && 'Rejeitado'}
        {status === 'changes_requested' && 'Alterações'}
      </Badge>
    );
  };

  const filteredData = approvals?.data || [];
  const totalPages = Math.ceil((approvals?.count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard de Aprovações</h2>
        <p className="text-muted-foreground mt-1">
          Acompanhe todas as aprovações de etapas dos projetos
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.total}</div>
                <p className="text-xs text-muted-foreground">
                  Aprovações registradas
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.pending}</div>
                <p className="text-xs text-muted-foreground">
                  Aguardando aprovação
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.approved}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.total > 0 ? `${Math.round((metrics.approved / metrics.total) * 100)}%` : '0%'} do total
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.rejected}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.total > 0 ? `${Math.round((metrics.rejected / metrics.total) * 100)}%` : '0%'} do total
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.avgDays}</div>
                <p className="text-xs text-muted-foreground">
                  dias para aprovar
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="changes_requested">Alterações Solicitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Projeto, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setClientFilter('');
                  setProjectFilter('');
                  setSearchTerm('');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aprovações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Aprovado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma aprovação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((approval: any) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">
                      {approval.project_stages?.projects?.name || '-'}
                    </TableCell>
                    <TableCell>{approval.project_stages?.title || '-'}</TableCell>
                    <TableCell>
                      {approval.project_stages?.projects?.clients?.client_type === 'pf'
                        ? approval.project_stages?.projects?.clients?.full_name
                        : approval.project_stages?.projects?.clients?.company_name || '-'}
                    </TableCell>
                    <TableCell>{approval.profiles?.full_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(approval.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(approval.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {approval.approved_at
                        ? format(new Date(approval.approved_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            totalItems={approvals?.count || 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
