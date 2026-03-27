import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileText, Image, Video, Code, Link as LinkIcon, FolderOpen, Palette, Film, MoreVertical, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categoria</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">URL Padrão</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
              <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
            </div>
            {!templates?.length ? (
              <div className="text-center py-12 bg-card rounded-xl border">
                <p className="text-[13px] text-muted-foreground">Nenhum template cadastrado</p>
              </div>
            ) : (
              templates.map((template, index) => {
                const Icon = categoryIcons[template.category] || LinkIcon;
                return (
                  <Card key={template.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                    <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${categoryColors[template.category]}`}><Icon className="h-3 w-3 text-white" /></div>
                          <p className="text-[14px] font-medium text-foreground truncate">{template.title}</p>
                        </div>
                      </div>
                      <div className="col-span-2"><Badge variant="secondary">{categoryLabels[template.category]}</Badge></div>
                      <div className="col-span-3"><p className="text-[13px] text-muted-foreground truncate">{template.url || '-'}</p></div>
                      <div className="col-span-2">
                        <Badge variant="default" className={template.is_active ? 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-50' : 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-gray-100 text-gray-600 border-0 hover:bg-gray-100'}>
                          <Circle className={`h-2 w-2 ${template.is_active ? 'fill-emerald-500 text-emerald-500' : 'fill-gray-400 text-gray-400'}`} />
                          {template.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                            <DropdownMenuItem onClick={() => handleOpenModal(template)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                            {template.is_active && (
                              <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => deleteMutation.mutate(template.id)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Desativar</DropdownMenuItem></>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
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
