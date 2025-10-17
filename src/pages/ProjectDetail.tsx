import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
// Components will be created
const ProjectStages = ({ projectId, onUpdate }: any) => <div>Etapas em desenvolvimento...</div>;
const ProjectLinks = ({ projectId }: any) => <div>Links em desenvolvimento...</div>;
const ProjectCredentials = ({ projectId }: any) => <div>Credenciais em desenvolvimento...</div>;
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            nickname
          ),
          project_types (
            id,
            name,
            color
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ['project-progress', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_project_progress', { project_id_param: id });
      
      if (error) throw error;
      return data || 0;
    },
  });

  const statusColors: Record<string, string> = {
    planejamento: 'bg-blue-500',
    em_andamento: 'bg-yellow-500',
    aguardando_aprovacao: 'bg-orange-500',
    concluido: 'bg-green-500',
    cancelado: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    planejamento: 'Planejamento',
    em_andamento: 'Em Andamento',
    aguardando_aprovacao: 'Aguardando Aprovação',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p>Carregando projeto...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Projeto não encontrado</p>
          <Button onClick={() => navigate('/projetos')} className="mt-4">
            Voltar para Projetos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const clientName = project.clients?.nickname || project.clients?.company_name || project.clients?.full_name || 'Cliente';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/projetos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{clientName}</p>
            </div>
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>
          </div>

          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="text-sm font-medium">
                  {project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="text-sm font-medium">
                  {project.due_date ? format(new Date(project.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>

            {project.project_value && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(project.project_value))}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="font-medium">{progress || 0}%</span>
            </div>
            <Progress value={progress || 0} className="h-2" />
          </div>
        </div>

        <Tabs defaultValue="stages" className="w-full">
          <TabsList>
            <TabsTrigger value="stages">Etapas</TabsTrigger>
            <TabsTrigger value="links">Links & Recursos</TabsTrigger>
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="mt-6">
            <ProjectStages projectId={id!} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="links" className="mt-6">
            <ProjectLinks projectId={id!} />
          </TabsContent>

          <TabsContent value="credentials" className="mt-6">
            <ProjectCredentials projectId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
