import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast, toastSuccess } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, MoreVertical } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

export function KnowledgeBaseTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1E40AF',
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Erro ao carregar categorias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const slug = generateSlug(formData.name);
      
      if (editingCategory) {
        const { error } = await supabase
          .from('knowledge_base_categories')
          .update({
            name: formData.name,
            slug,
            description: formData.description,
            color: formData.color,
            is_active: formData.is_active,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toastSuccess('Categoria atualizada', 'Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('knowledge_base_categories')
          .insert({
            name: formData.name,
            slug,
            description: formData.description,
            color: formData.color,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toastSuccess('Categoria criada', 'Categoria criada com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Erro ao salvar categoria',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('knowledge_base_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toastSuccess('Categoria excluída', 'Categoria excluída com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Erro ao excluir categoria',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toastSuccess('Status atualizado', 'Status atualizado com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#1E40AF',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categorias da Base de Conhecimento</h2>
          <p className="text-muted-foreground">
            Gerencie as categorias dos artigos da base de conhecimento
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
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
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
            <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span></div>
            <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição</span></div>
            <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cor</span></div>
            <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
            <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <p className="text-[13px] text-muted-foreground">Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            categories.map((category, index) => (
              <Card key={category.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                  <div className="col-span-3"><p className="text-[14px] font-medium text-foreground truncate">{category.name}</p></div>
                  <div className="col-span-3"><p className="text-[13px] text-muted-foreground truncate">{category.description || '-'}</p></div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md border" style={{ backgroundColor: category.color }} />
                      <span className="text-[13px] text-muted-foreground">{category.color}</span>
                    </div>
                  </div>
                  <div className="col-span-2"><Switch checked={category.is_active} onCheckedChange={() => handleToggleActive(category.id, category.is_active)} /></div>
                  <div className="col-span-2 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                        <DropdownMenuItem onClick={() => openEditDialog(category)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
