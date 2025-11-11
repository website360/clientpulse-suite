import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { useCachedDepartments } from '@/hooks/useCachedDepartments';
import { useAuth } from '@/contexts/AuthContext';

interface Macro {
  id: string;
  name: string;
  shortcut: string | null;
  content: string;
  department_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MacroFormData {
  name: string;
  shortcut: string;
  content: string;
  department_id: string;
  is_active: boolean;
}

export function TicketMacrosSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: departments = [] } = useCachedDepartments();
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [formData, setFormData] = useState<MacroFormData>({
    name: '',
    shortcut: '',
    content: '',
    department_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchMacros();
  }, []);

  const fetchMacros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_macros')
        .select('*')
        .order('name');

      if (error) throw error;
      setMacros(data || []);
    } catch (error) {
      console.error('Error fetching macros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os macros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const payload = {
        name: formData.name,
        shortcut: formData.shortcut || null,
        content: formData.content,
        department_id: formData.department_id || null,
        is_active: formData.is_active,
        created_by: user.id,
      };

      if (editingMacro) {
        const { error } = await supabase
          .from('ticket_macros')
          .update(payload)
          .eq('id', editingMacro.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Macro atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('ticket_macros')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Macro criado com sucesso',
        });
      }

      setOpen(false);
      resetForm();
      fetchMacros();
    } catch (error) {
      console.error('Error saving macro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o macro',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (macro: Macro) => {
    setEditingMacro(macro);
    setFormData({
      name: macro.name,
      shortcut: macro.shortcut || '',
      content: macro.content,
      department_id: macro.department_id || '',
      is_active: macro.is_active,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este macro?')) return;

    try {
      const { error } = await supabase
        .from('ticket_macros')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Macro excluído com sucesso',
      });

      fetchMacros();
    } catch (error) {
      console.error('Error deleting macro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o macro',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortcut: '',
      content: '',
      department_id: '',
      is_active: true,
    });
    setEditingMacro(null);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Todos';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Macros de Tickets
            </CardTitle>
            <CardDescription>
              Configure templates de resposta rápida com atalhos de teclado
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Macro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingMacro ? 'Editar Macro' : 'Novo Macro'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure um template de resposta rápida para usar nos tickets
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Macro *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Boas-vindas"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortcut">Atalho (opcional)</Label>
                      <Input
                        id="shortcut"
                        value={formData.shortcut}
                        onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                        placeholder="Ex: /bv"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os departamentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os departamentos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo da Resposta *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Digite o template da resposta..."
                      rows={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Você pode usar variáveis como {'{cliente}'}, {'{ticket}'}, {'{usuario}'} no texto
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Macro ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingMacro ? 'Salvar Alterações' : 'Criar Macro'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando macros...
          </div>
        ) : macros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum macro configurado ainda
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Atalho</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {macros.map((macro) => (
                  <TableRow key={macro.id}>
                    <TableCell className="font-medium">{macro.name}</TableCell>
                    <TableCell>
                      {macro.shortcut && (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {macro.shortcut}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>{getDepartmentName(macro.department_id)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {macro.content}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        macro.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {macro.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(macro)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(macro.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
