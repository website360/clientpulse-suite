import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingApproval {
  id: string;
  created_at: string;
  notes: string | null;
  project_stage: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
      client: {
        company_name: string | null;
        full_name: string | null;
      };
    };
  };
}

export function PendingApprovals() {
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_approvals')
        .select(`
          id,
          created_at,
          notes,
          project_stage:project_stages (
            id,
            name,
            project:projects (
              id,
              name,
              client:clients (
                company_name,
                full_name
              )
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingApproval[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Aprovações Pendentes
          </CardTitle>
          <CardDescription>
            Etapas de projetos aguardando aprovação do cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalPending = approvals?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Aprovações Pendentes
              {totalPending > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalPending}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Etapas de projetos aguardando aprovação do cliente
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!approvals || approvals.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Nenhuma aprovação pendente"
            description="Todas as etapas estão aprovadas ou não requerem aprovação"
          />
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => {
              const project = approval.project_stage?.project;
              const client = project?.client;
              const clientName = client?.company_name || client?.full_name || 'Cliente não informado';

              return (
                <div
                  key={approval.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight">
                          {project?.name || 'Projeto sem nome'}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          Etapa: {approval.project_stage?.name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cliente: {clientName}
                        </p>
                      </div>
                      
                      <Link to={`/projetos/${project?.id}`}>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Solicitado em {format(new Date(approval.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    
                    {approval.notes && (
                      <p className="text-xs text-muted-foreground italic mt-2 line-clamp-2">
                        "{approval.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
