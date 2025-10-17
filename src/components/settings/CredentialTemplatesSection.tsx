import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Server, Database, Mail, Globe, Key } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>URL Padrão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((template) => {
                const Icon = categoryIcons[template.category] || Key;
                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${categoryColors[template.category]}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {template.service_name}
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
