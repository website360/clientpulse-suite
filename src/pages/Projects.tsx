import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ApprovalsTab } from '@/components/projects/ApprovalsTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [filters, setFilters] = useState({
    client: '',
    type: '',
    status: '',
  });

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            responsible_name,
            client_type
          ),
          project_types (
            id,
            name,
            color
          )
        `)
        .order('name', { ascending: true });

      if (filters.client) {
        query = query.eq('client_id', filters.client);
      }
      if (filters.type) {
        query = query.eq('project_type_id', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModal();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Projetos</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>

        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="approvals">Aprovações</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <ProjectFilters filters={filters} onFiltersChange={setFilters} />

            <ProjectTable
              projects={projects || []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab />
          </TabsContent>
        </Tabs>

        <ProjectFormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          project={selectedProject}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
