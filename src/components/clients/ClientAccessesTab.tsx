import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast, toastSuccess } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, MoreVertical, Circle, Eye, EyeOff, Copy } from 'lucide-react';

interface ClientAccess {
  id: string;
  client_id: string;
  service_name: string;
  url: string | null;
  username: string | null;
  password: string | null;
  favicon_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ClientAccessesTabProps {
  clientId: string;
}

export function ClientAccessesTab({ clientId }: ClientAccessesTabProps) {
  const [accesses, setAccesses] = useState<ClientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<ClientAccess | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [faviconErrors, setFaviconErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    service_name: '',
    url: '',
    username: '',
    password: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    fetchAccesses();
  }, [clientId]);

  const fetchAccesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_accesses')
        .select('*')
        .eq('client_id', clientId)
        .order('service_name');

      if (error) throw error;
      setAccesses(data || []);
    } catch (error) {
      console.error('Error fetching accesses:', error);
      toast({
        title: 'Erro ao carregar acessos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavicon = async (url: string): Promise<string | null> => {
    try {
      const urlObj = new URL(url);
      // Remover www do hostname
      let hostname = urlObj.hostname.replace(/^www\./, '');
      
      // Se for .com.br, tentar usar apenas .com (ex: cloudflare.com.br -> cloudflare.com)
      // Isso funciona melhor para serviços internacionais
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[parts.length - 2] === 'com' && parts[parts.length - 1] === 'br') {
        hostname = parts.slice(0, -1).join('.'); // Remove .br
      }
      
      // Usar Google Favicons - não tem problema de CORS
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      return faviconUrl;
    } catch {
      return null;
    }
  };

  const handleOpenDialog = (access?: ClientAccess) => {
    if (access) {
      setEditingAccess(access);
      setFormData({
        service_name: access.service_name,
        url: access.url || '',
        username: access.username || '',
        password: access.password || '',
        notes: access.notes || '',
        is_active: access.is_active,
      });
    } else {
      setEditingAccess(null);
      setFormData({
        service_name: '',
        url: '',
        username: '',
        password: '',
        notes: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAccess(null);
    setFormData({
      service_name: '',
      url: '',
      username: '',
      password: '',
      notes: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let faviconUrl = null;
      if (formData.url) {
        faviconUrl = await fetchFavicon(formData.url);
      }

      const accessData = {
        client_id: clientId,
        service_name: formData.service_name,
        url: formData.url || null,
        username: formData.username || null,
        password: formData.password || null,
        favicon_url: faviconUrl,
        notes: formData.notes || null,
        is_active: formData.is_active,
        updated_by: user.id,
      };

      if (editingAccess) {
        const { error } = await supabase
          .from('client_accesses')
          .update(accessData)
          .eq('id', editingAccess.id);

        if (error) throw error;
        toastSuccess('Acesso atualizado', 'Acesso atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('client_accesses')
          .insert({ ...accessData, created_by: user.id });

        if (error) throw error;
        toastSuccess('Acesso criado', 'Acesso criado com sucesso!');
      }

      handleCloseDialog();
      fetchAccesses();
    } catch (error) {
      console.error('Error saving access:', error);
      toast({
        title: 'Erro ao salvar acesso',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este acesso?')) return;

    try {
      const { error } = await supabase
        .from('client_accesses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toastSuccess('Acesso excluído', 'Acesso excluído com sucesso!');
      fetchAccesses();
    } catch (error) {
      console.error('Error deleting access:', error);
      toast({
        title: 'Erro ao excluir acesso',
        variant: 'destructive',
      });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${label} copiado`,
        description: `${label} copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Acessos do Cliente</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Gerencie credenciais de serviços e plataformas do cliente
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Acesso
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando acessos...</p>
      ) : (
        <div className="space-y-2">
          {accesses.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <p className="text-[13px] text-muted-foreground">Nenhum acesso cadastrado</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
                <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Serviço</span></div>
                <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Usuário</span></div>
                <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Senha</span></div>
                <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Observações</span></div>
                <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
                <div className="col-span-1 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
              </div>
              {accesses.map((access, index) => (
                <Card key={access.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group" style={{ animationDelay: `${index * 30}ms` }}>
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {access.favicon_url && !faviconErrors[access.id] ? (
                            <img 
                              src={access.favicon_url} 
                              alt="" 
                              className="w-6 h-6 rounded" 
                              onError={() => setFaviconErrors(prev => ({ ...prev, [access.id]: true }))} 
                            />
                          ) : (
                            <span className="text-[14px] font-semibold text-primary">{access.service_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-foreground truncate">{access.service_name}</p>
                          {access.url && (
                            <p className="text-[13px] text-muted-foreground truncate">{new URL(access.url).hostname}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {access.username ? (
                        <div className="flex items-center gap-1">
                          <p className="text-[14px] text-foreground truncate">{access.username}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); copyToClipboard(access.username!, 'Usuário'); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[14px] text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {access.password ? (
                        <div className="flex items-center gap-1">
                          <p className="text-[14px] text-foreground font-mono">
                            {showPasswords[access.id] ? access.password : '••••••••'}
                          </p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(access.id); }}>
                            {showPasswords[access.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); copyToClipboard(access.password!, 'Senha'); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[14px] text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="col-span-3">
                      {access.notes ? (
                        <p className="text-[13px] text-muted-foreground truncate italic">{access.notes}</p>
                      ) : (
                        <span className="text-[14px] text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Badge variant="default" className={access.is_active ? 'bg-green-50 text-green-700 border-0 hover:bg-green-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit' : 'bg-gray-100 text-gray-600 border-0 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'}>
                        <Circle className={`h-2 w-2 ${access.is_active ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
                        {access.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(access); }} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(access.id); }} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccess ? 'Editar Acesso' : 'Novo Acesso'}</DialogTitle>
            <DialogDescription>
              {editingAccess ? 'Atualize as informações do acesso' : 'Cadastre um novo acesso do cliente'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_name">Nome do Serviço *</Label>
              <Input
                id="service_name"
                placeholder="Ex: CloudFlare, Hostinger, Google Ads"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL do Serviço</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://exemplo.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">O favicon será capturado automaticamente</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário/Email</Label>
              <Input
                id="username"
                placeholder="usuario@exemplo.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre este acesso..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active" className="text-[13px]">Acesso ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingAccess ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
