import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, MoreVertical, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StageTemplatesSection } from './StageTemplatesSection';
import { CredentialTemplatesSection } from './CredentialTemplatesSection';
import { LinkTemplatesSection } from './LinkTemplatesSection';

export function ProjectsSettingsTab() {
  return (
    <Tabs defaultValue="types" className="space-y-6">
      <TabsList>
        <TabsTrigger value="types">Tipos de Projeto</TabsTrigger>
        <TabsTrigger value="stages">Etapas</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="credentials">Credenciais</TabsTrigger>
      </TabsList>

      <TabsContent value="types">
        <ProjectTypesSection />
      </TabsContent>

      <TabsContent value="stages">
        <StageTemplatesSection />
      </TabsContent>

      <TabsContent value="links">
        <LinkTemplatesSection />
      </TabsContent>

      <TabsContent value="credentials">
        <CredentialTemplatesSection />
      </TabsContent>
    </Tabs>
  );
}

function ProjectTypesSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1E40AF',
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['project-types-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedType) {
        const { error } = await supabase
          .from('project_types')
          .update(data)
          .eq('id', selectedType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_types')
          .insert([{ ...data, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-types-settings'] });
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      toast({
        title: selectedType ? 'Tipo atualizado' : 'Tipo criado',
        description: 'As alterações foram salvas com sucesso.',
      });
      handleCloseModal();
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o tipo de projeto.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_types')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-types-settings'] });
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      toast({
        title: 'Tipo desativado',
        description: 'O tipo de projeto foi desativado.',
      });
    },
  });

  const handleOpenModal = (type?: any) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        name: type.name || '',
        description: type.description || '',
        color: type.color || '#1E40AF',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setFormData({
      name: '',
      description: '',
      color: '#1E40AF',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Projeto</CardTitle>
              <CardDescription>
                Gerencie os tipos de projeto disponíveis no sistema
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cor</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
              <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
            </div>
            {!projectTypes?.length ? (
              <div className="text-center py-12 bg-card rounded-xl border">
                <p className="text-[13px] text-muted-foreground">Nenhum tipo de projeto cadastrado</p>
              </div>
            ) : (
              projectTypes.map((type, index) => (
                <Card key={type.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                  <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                    <div className="col-span-3">
                      <p className="text-[14px] font-medium text-foreground truncate">{type.name}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[13px] text-muted-foreground truncate">{type.description || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md border" style={{ backgroundColor: type.color }} />
                        <span className="text-[13px] text-muted-foreground">{type.color}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="default" className={type.is_active ? 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-50' : 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-gray-100 text-gray-600 border-0 hover:bg-gray-100'}>
                        <Circle className={`h-2 w-2 ${type.is_active ? 'fill-emerald-500 text-emerald-500' : 'fill-gray-400 text-gray-400'}`} />
                        {type.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                          <DropdownMenuItem onClick={() => handleOpenModal(type)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          {type.is_active && (
                            <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => deleteMutation.mutate(type.id)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Desativar</DropdownMenuItem></>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedType ? 'Editar Tipo de Projeto' : 'Novo Tipo de Projeto'}
            </DialogTitle>
            <DialogDescription>
              Defina os tipos de projeto disponíveis no sistema
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
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
            <div>
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : selectedType ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
