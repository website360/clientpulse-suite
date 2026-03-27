import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Server, Database, Mail, Globe, Key, MoreVertical, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function CredentialTemplatesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    category: 'other',
    url: '',
  });

  const { data: templates } = useQuery({
    queryKey: ['project-credential-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_credential_templates')
        .select('*')
        .order('service_name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('project_credential_templates')
          .update(data)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_credential_templates')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-credential-templates'] });
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
        .from('project_credential_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-credential-templates'] });
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
        service_name: template.service_name || '',
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
      service_name: '',
      category: 'other',
      url: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const categoryIcons: Record<string, any> = {
    hosting: Server,
    cloudflare: Server,
    domain_registry: Globe,
    cms: Server,
    ftp: Server,
    database: Database,
    api: Key,
    email: Mail,
    other: Key,
  };

  const categoryLabels: Record<string, string> = {
    hosting: 'Hospedagem',
    cloudflare: 'Cloudflare',
    domain_registry: 'Registro de Domínio',
    cms: 'CMS',
    ftp: 'FTP',
    database: 'Banco de Dados',
    api: 'API',
    email: 'E-mail',
    other: 'Outro',
  };

  const categoryColors: Record<string, string> = {
    hosting: 'bg-blue-500',
    cloudflare: 'bg-orange-500',
    domain_registry: 'bg-green-500',
    cms: 'bg-indigo-500',
    ftp: 'bg-cyan-500',
    database: 'bg-purple-500',
    api: 'bg-yellow-500',
    email: 'bg-red-500',
    other: 'bg-gray-500',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Credenciais</CardTitle>
              <CardDescription>
                Pré-cadastre serviços com categoria e URL padrão
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
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Serviço</span></div>
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
                const Icon = categoryIcons[template.category] || Key;
                return (
                  <Card key={template.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                    <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${categoryColors[template.category]}`}><Icon className="h-3 w-3 text-white" /></div>
                          <p className="text-[14px] font-medium text-foreground truncate">{template.service_name}</p>
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
              {selectedTemplate ? 'Editar Template' : 'Novo Template de Credencial'}
            </DialogTitle>
            <DialogDescription>
              Configure serviços pré-cadastrados com categoria e URL padrão
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="service_name">Nome do Serviço *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="Ex: cPanel, MySQL, Gmail"
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
                  <SelectItem value="hosting">Hospedagem</SelectItem>
                  <SelectItem value="cloudflare">Cloudflare</SelectItem>
                  <SelectItem value="domain_registry">Registro de Domínio</SelectItem>
                  <SelectItem value="cms">CMS</SelectItem>
                  <SelectItem value="ftp">FTP</SelectItem>
                  <SelectItem value="database">Banco de Dados</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
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
