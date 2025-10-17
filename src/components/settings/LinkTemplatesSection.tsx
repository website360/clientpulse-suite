import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileText, Image, Video, Code, Link as LinkIcon, FolderOpen, Palette, Film } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function LinkTemplatesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    url: '',
  });

  const { data: templates } = useQuery({
    queryKey: ['project-link-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_link_templates')
        .select('*')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('project_link_templates')
          .update(data)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_link_templates')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-link-templates'] });
      toast({
        title: selectedTemplate ? 'Template atualizado' : 'Template criado',
        description: 'As alterações foram salvas com sucesso.',
      });
      handleCloseModal();
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_link_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-link-templates'] });
      toast({
        title: 'Template desativado',
        description: 'O template foi desativado com sucesso.',
      });
    },
  });

  const handleOpenModal = (template?: any) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        title: template.title || '',
        category: template.category || 'other',
        url: template.url || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
    setFormData({
      title: '',
      category: 'other',
      url: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const categoryIcons: Record<string, any> = {
    google_drive: FolderOpen,
    images: Image,
    identity: Palette,
    copy: FileText,
    prototype: Code,
    documentation: FileText,
    other: LinkIcon,
  };

  const categoryLabels: Record<string, string> = {
    google_drive: 'Google Drive',
    images: 'Imagens',
    identity: 'Identidade Visual',
    copy: 'Textos/Copy',
    prototype: 'Protótipo',
    documentation: 'Documentação',
    other: 'Outro',
  };

  const categoryColors: Record<string, string> = {
    google_drive: 'bg-green-500',
    images: 'bg-purple-500',
    identity: 'bg-pink-500',
    copy: 'bg-blue-500',
    prototype: 'bg-indigo-500',
    documentation: 'bg-orange-500',
    other: 'bg-gray-500',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Links</CardTitle>
              <CardDescription>
                Pré-cadastre tipos de links com categoria e URL padrão
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>URL Padrão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((template) => {
                const Icon = categoryIcons[template.category] || LinkIcon;
                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${categoryColors[template.category]}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {template.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabels[template.category]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{template.url || '-'}</TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <span className="text-green-600">Ativo</span>
                      ) : (
                        <span className="text-gray-400">Inativo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {template.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!templates?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum template cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Editar Template' : 'Novo Template de Link'}
            </DialogTitle>
            <DialogDescription>
              Configure links pré-cadastrados com categoria e URL padrão
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Google Drive, Figma, Canva"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_drive">Google Drive</SelectItem>
                  <SelectItem value="images">Imagens</SelectItem>
                  <SelectItem value="identity">Identidade Visual</SelectItem>
                  <SelectItem value="copy">Textos/Copy</SelectItem>
                  <SelectItem value="prototype">Protótipo</SelectItem>
                  <SelectItem value="documentation">Documentação</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.category !== 'other' && (
              <div>
                <Label htmlFor="url">URL Padrão</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe em branco se não houver URL padrão
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : selectedTemplate ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
