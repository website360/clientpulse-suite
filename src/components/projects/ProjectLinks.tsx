import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ExternalLink, Edit2, Trash2, FileText, Image, Video, Code, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectLinksProps {
  projectId: string;
}

export function ProjectLinks({ projectId }: ProjectLinksProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: 'other',
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ['project-links', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_links')
        .select('*')
        .eq('project_id', projectId)
        .order('order');

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedLink) {
        const { error } = await supabase
          .from('project_links')
          .update(data)
          .eq('id', selectedLink.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_links')
          .insert([{ ...data, project_id: projectId, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-links', projectId] });
      toast({
        title: selectedLink ? 'Link atualizado' : 'Link criado',
        description: 'As alterações foram salvas com sucesso.',
      });
      handleCloseModal();
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o link.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-links', projectId] });
      toast({
        title: 'Link excluído',
        description: 'O link foi removido com sucesso.',
      });
    },
  });

  const handleOpenModal = (link?: any) => {
    if (link) {
      setSelectedLink(link);
      setFormData({
        title: link.title || '',
        url: link.url || '',
        description: link.description || '',
        category: link.category || 'other',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLink(null);
    setFormData({
      title: '',
      url: '',
      description: '',
      category: 'other',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const categoryIcons: Record<string, any> = {
    documentation: FileText,
    design: Image,
    video: Video,
    repository: Code,
    other: LinkIcon,
  };

  const categoryLabels: Record<string, string> = {
    documentation: 'Documentação',
    design: 'Design',
    video: 'Vídeo',
    repository: 'Repositório',
    other: 'Outro',
  };

  const categoryColors: Record<string, string> = {
    documentation: 'bg-blue-500',
    design: 'bg-purple-500',
    video: 'bg-red-500',
    repository: 'bg-green-500',
    other: 'bg-gray-500',
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando links...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Links & Recursos</CardTitle>
              <CardDescription>
                Gerencie links importantes relacionados ao projeto
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {links && links.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {links.map((link) => {
                const Icon = categoryIcons[link.category] || LinkIcon;
                return (
                  <div
                    key={link.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded ${categoryColors[link.category]}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{link.title}</h4>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {categoryLabels[link.category]}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(link.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(link)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {link.url}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum link cadastrado ainda
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLink ? 'Editar Link' : 'Novo Link'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documentation">Documentação</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="repository">Repositório</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : selectedLink ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
