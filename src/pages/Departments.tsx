import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1E40AF',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Erro ao carregar departamentos',
        description: 'Não foi possível carregar a lista de departamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(formData)
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast({
          title: 'Departamento atualizado',
          description: 'Departamento atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Departamento criado',
          description: 'Departamento criado com sucesso.',
        });
      }
      setModalOpen(false);
      setEditingDepartment(null);
      setFormData({ name: '', description: '', color: '#1E40AF' });
      fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o departamento.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      color: department.color,
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDepartmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;

    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', departmentToDelete);

      if (error) throw error;
      toast({
        title: 'Departamento excluído',
        description: 'Departamento excluído com sucesso.',
      });
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o departamento.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  };

  const openNewModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', description: '', color: '#1E40AF' });
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">Departamentos</h1>
              <p className="text-[15px] text-muted-foreground">
                Gerencie os departamentos do sistema
              </p>
            </div>
            <Button onClick={openNewModal} size="lg" className="h-11 shadow-md hover:shadow-lg bg-[#141924] hover:bg-[#1a2030] text-white">
              Novo Departamento
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando departamentos...</p>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
                <div className="col-span-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span>
                </div>
                <div className="col-span-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cor</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
                </div>
              </div>

              {/* Department Rows as Cards */}
              {departments.map((dept, index) => (
                <Card 
                  key={dept.id}
                  className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                    <div className="col-span-3">
                      <p className="text-[14px] font-medium text-foreground">{dept.name}</p>
                    </div>
                    <div className="col-span-4">
                      <p className="text-[14px] text-foreground">{dept.description || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded" style={{ backgroundColor: dept.color }} />
                        <span className="text-[14px] text-muted-foreground">{dept.color}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                        {dept.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(dept.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? 'Editar Departamento' : 'Novo Departamento'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do departamento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex items-center gap-2">
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
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingDepartment ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Departamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este departamento? Esta ação pode ser revertida posteriormente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
