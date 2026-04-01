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
import { Plus, Pencil, Trash2, Zap, Search, MoreVertical, Circle, Mail, MessageSquare, Download } from 'lucide-react';
import { useCachedDepartments } from '@/hooks/useCachedDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiPicker } from '@/components/shared/EmojiPicker';
import { MessageTemplateEditor } from './MessageTemplateEditor';
import { DEFAULT_MESSAGE_TEMPLATES } from '@/data/defaultMessageTemplates';

interface Macro {
  id: string;
  name: string;
  shortcut: string | null;
  content: string;
  department_id: string | null;
  is_active: boolean;
  channel?: 'text' | 'email' | 'whatsapp' | 'both';
  email_subject?: string | null;
  email_html?: string | null;
  whatsapp_template?: string | null;
  template_category?: string | null;
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
  channel: 'text' | 'email' | 'whatsapp' | 'both';
  email_subject: string;
  email_html: string;
  whatsapp_template: string;
  template_category: string;
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
    channel: 'text',
    email_subject: '',
    email_html: '',
    whatsapp_template: '',
    template_category: 'custom',
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
    channel: formData.channel,
    email_subject: formData.email_subject || null,
    email_html: formData.email_html || null,
    whatsapp_template: formData.whatsapp_template || null,
    template_category: formData.template_category,
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
      channel: macro.channel || 'text',
      email_subject: macro.email_subject || '',
      email_html: macro.email_html || '',
      whatsapp_template: macro.whatsapp_template || '',
      template_category: macro.template_category || 'custom',
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
      channel: 'text',
      email_subject: '',
      email_html: '',
      whatsapp_template: '',
      template_category: 'custom',
    });
    setEditingMacro(null);
  };

  const loadDefaultTemplate = (templateKey: string) => {
    const template = DEFAULT_MESSAGE_TEMPLATES[templateKey as keyof typeof DEFAULT_MESSAGE_TEMPLATES];
    if (template) {
      setFormData({
        ...formData,
        name: template.name,
        channel: 'both',
        email_subject: template.email_subject,
        email_html: template.email_html,
        whatsapp_template: template.whatsapp_template,
        template_category: template.category,
      });
      toast({
        title: 'Template Carregado',
        description: `Template "${template.name}" carregado com sucesso`,
      });
    }
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
                Configure templates de resposta rápida para Email e WhatsApp com atalhos de teclado
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
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                  {/* Load Default Template */}
                  <div className="space-y-2">
                    <Label>Templates Padrão (WHMCS)</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('ticket_opened')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Ticket Aberto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('ticket_reply')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Resposta ao Ticket
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('ticket_closed')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Ticket Fechado
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('payment_reminder')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Lembrete de Pagamento
                      </Button>
                    </div>
                  </div>
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
                  {/* Message Template Editor */}
                  <MessageTemplateEditor
                    channel={formData.channel}
                    emailSubject={formData.email_subject}
                    emailHtml={formData.email_html}
                    whatsappTemplate={formData.whatsapp_template}
                    content={formData.content}
                    onChannelChange={(channel) => setFormData({ ...formData, channel })}
                    onEmailSubjectChange={(subject) => setFormData({ ...formData, email_subject: subject })}
                    onEmailHtmlChange={(html) => setFormData({ ...formData, email_html: html })}
                    onWhatsappTemplateChange={(template) => setFormData({ ...formData, whatsapp_template: template })}
                    onContentChange={(content) => setFormData({ ...formData, content })}
                  />
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
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span></div>
              <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Canal</span></div>
              <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atalho</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Departamento</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Conteúdo</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
              <div className="col-span-1 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
            </div>
            {filteredMacros.map((macro, index) => (
              <Card key={macro.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                  <div className="col-span-2">
                    <p className="text-[14px] font-medium text-foreground truncate">{macro.name}</p>
                  </div>
                  <div className="col-span-1">
                    {macro.channel === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                    {macro.channel === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-600" />}
                    {macro.channel === 'both' && (
                      <div className="flex gap-1">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                      </div>
                    )}
                    {(!macro.channel || macro.channel === 'text') && <span className="text-xs text-muted-foreground">Texto</span>}
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
