import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Zap, Search, MoreVertical, Circle } from 'lucide-react';
import { useCachedDepartments } from '@/hooks/useCachedDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiPicker } from '@/components/shared/EmojiPicker';

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
  const [searchTerm, setSearchTerm] = useState('');
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
    department_id: formData.department_id === 'all' ? null : formData.department_id || null,
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
      department_id: macro.department_id || 'all',
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
      department_id: 'all',
      is_active: true,
    });
    setEditingMacro(null);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Todos';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'N/A';
  };

  const filteredMacros = macros.filter((macro) => {
    const search = searchTerm.toLowerCase();
    return (
      macro.name.toLowerCase().includes(search) ||
      macro.shortcut?.toLowerCase().includes(search) ||
      macro.content.toLowerCase().includes(search)
    );
  });

  const getPreviewContent = (content: string) => {
    return content
      .replace(/{cliente}/g, 'João Silva')
      .replace(/{ticket}/g, '#12345')
      .replace(/{usuario}/g, user?.user_metadata?.full_name || 'Técnico');
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
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
                        <SelectItem value="all">Todos os departamentos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="content">Conteúdo da Resposta *</Label>
                      <EmojiPicker 
                        onEmojiSelect={(emoji) => {
                          const textarea = document.getElementById('content') as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newContent = formData.content.substring(0, start) + emoji + formData.content.substring(end);
                          setFormData({ ...formData, content: newContent });
                          // Restore cursor position after emoji insertion
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + emoji.length, start + emoji.length);
                          }, 0);
                        }}
                      />
                    </div>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Digite o template da resposta..."
                      rows={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Você pode usar variáveis como {'{cliente}'}, {'{cliente}'}, {'{usuario}'} no texto
                    </p>
                  </div>
                  {formData.content && (
                    <div className="space-y-2">
                      <Label>Preview da Mensagem</Label>
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <p className="text-sm whitespace-pre-wrap">
                          {getPreviewContent(formData.content)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este é um exemplo de como o macro ficará ao ser usado
                      </p>
                    </div>
                  )}
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, atalho ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
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
        ) : filteredMacros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum macro encontrado com os filtros aplicados
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span></div>
              <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atalho</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Departamento</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Conteúdo</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
              <div className="col-span-1 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
            </div>
            {filteredMacros.map((macro, index) => (
              <Card key={macro.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                  <div className="col-span-3">
                    <p className="text-[14px] font-medium text-foreground truncate">{macro.name}</p>
                  </div>
                  <div className="col-span-1">
                    {macro.shortcut && (
                      <code className="text-[12px] bg-muted px-1.5 py-0.5 rounded">{macro.shortcut}</code>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[13px] text-muted-foreground truncate">{getDepartmentName(macro.department_id)}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[13px] text-muted-foreground truncate">{macro.content}</p>
                  </div>
                  <div className="col-span-2">
                    <Badge
                      variant="default"
                      className={macro.is_active
                        ? 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-50'
                        : 'font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-gray-100 text-gray-600 border-0 hover:bg-gray-100'
                      }
                    >
                      <Circle className={`h-2 w-2 ${macro.is_active ? 'fill-emerald-500 text-emerald-500' : 'fill-gray-400 text-gray-400'}`} />
                      {macro.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                        <DropdownMenuItem onClick={() => handleEdit(macro)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(macro.id)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
