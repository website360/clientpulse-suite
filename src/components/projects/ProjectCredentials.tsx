import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Eye, EyeOff, Copy, Edit2, Trash2, Server, Database, Mail, Globe, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectCredentialsProps {
  projectId: string;
}

export function ProjectCredentials({ projectId }: ProjectCredentialsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    service_name: '',
    username: '',
    password: '',
    url: '',
    category: 'other',
    notes: '',
  });

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['project-credentials', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_credentials')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const credentialData = {
        service_name: data.service_name,
        username: data.username,
        password_encrypted: btoa(data.password), // Simple encoding - in production use proper encryption
        url: data.url || null,
        category: data.category,
        notes: data.notes || null,
      };

      if (selectedCredential) {
        const { error } = await supabase
          .from('project_credentials')
          .update(credentialData)
          .eq('id', selectedCredential.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_credentials')
          .insert([{ ...credentialData, project_id: projectId, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-credentials', projectId] });
      toast({
        title: selectedCredential ? 'Credencial atualizada' : 'Credencial criada',
        description: 'As alterações foram salvas com sucesso.',
      });
      handleCloseModal();
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a credencial.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_credentials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-credentials', projectId] });
      toast({
        title: 'Credencial excluída',
        description: 'A credencial foi removida com sucesso.',
      });
    },
  });

  const handleOpenModal = (credential?: any) => {
    if (credential) {
      setSelectedCredential(credential);
      setFormData({
        service_name: credential.service_name || '',
        username: credential.username || '',
        password: atob(credential.password_encrypted || ''),
        url: credential.url || '',
        category: credential.category || 'other',
        notes: credential.notes || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCredential(null);
    setFormData({
      service_name: '',
      username: '',
      password: '',
      url: '',
      category: 'other',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const categoryIcons: Record<string, any> = {
    hosting: Server,
    database: Database,
    email: Mail,
    domain: Globe,
    other: Key,
  };

  const categoryLabels: Record<string, string> = {
    hosting: 'Hospedagem',
    database: 'Banco de Dados',
    email: 'E-mail',
    domain: 'Domínio',
    other: 'Outro',
  };

  const categoryColors: Record<string, string> = {
    hosting: 'bg-blue-500',
    database: 'bg-purple-500',
    email: 'bg-red-500',
    domain: 'bg-green-500',
    other: 'bg-gray-500',
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando credenciais...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credenciais de Acesso</CardTitle>
              <CardDescription>
                Gerencie credenciais e senhas relacionadas ao projeto
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Credencial
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentials && credentials.length > 0 ? (
            <div className="space-y-4">
              {credentials.map((credential) => {
                const Icon = categoryIcons[credential.category] || Key;
                const isVisible = visiblePasswords[credential.id];
                const password = atob(credential.password_encrypted || '');

                return (
                  <div
                    key={credential.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${categoryColors[credential.category]}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{credential.service_name}</h4>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {categoryLabels[credential.category]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(credential)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(credential.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {credential.username && (
                        <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                          <div>
                            <span className="text-muted-foreground">Usuário: </span>
                            <span className="font-mono">{credential.username}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(credential.username, 'Usuário')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-muted-foreground">Senha: </span>
                          <span className="font-mono">
                            {isVisible ? password : '••••••••'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(credential.id)}
                          >
                            {isVisible ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(password, 'Senha')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {credential.url && (
                        <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                          <div className="flex-1 min-w-0">
                            <span className="text-muted-foreground">URL: </span>
                            <a
                              href={credential.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-blue-500 hover:underline truncate"
                            >
                              {credential.url}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(credential.url, 'URL')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {credential.notes && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Observações:</p>
                          <p>{credential.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma credencial cadastrada ainda
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCredential ? 'Editar Credencial' : 'Nova Credencial'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="service_name">Serviço *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="Ex: cPanel, MySQL, Gmail"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosting">Hospedagem</SelectItem>
                  <SelectItem value="database">Banco de Dados</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="domain">Domínio</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : selectedCredential ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
