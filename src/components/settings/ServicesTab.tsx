import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function ServicesTab() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar serviços');
      return;
    }

    setServices(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Serviço atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('services')
          .insert({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success('Serviço criado com sucesso');
      }

      setIsOpen(false);
      setEditingService(null);
      setFormData({ name: '', description: '', is_active: true });
      fetchServices();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      is_active: service.is_active,
    });
    setIsOpen(true);
  };

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; service: Service | null }>({
    isOpen: false,
    service: null,
  });

  const handleToggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    toast.success('Status atualizado com sucesso');
    fetchServices();
  };

  const handleDelete = (service: Service) => {
    setDeleteConfirmModal({ isOpen: true, service });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.service) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', deleteConfirmModal.service.id);

    if (error) {
      toast.error('Erro ao excluir serviço');
      return;
    }

    toast.success('Serviço excluído com sucesso');
    setDeleteConfirmModal({ isOpen: false, service: null });
    fetchServices();
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingService(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Serviços</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os serviços oferecidos
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
          <div className="col-span-4"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</span></div>
          <div className="col-span-4"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descrição</span></div>
          <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
          <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
        </div>
        {services.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <p className="text-[13px] text-muted-foreground">Nenhum serviço cadastrado</p>
          </div>
        ) : (
          services.map((service, index) => (
            <Card key={service.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
              <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                <div className="col-span-4">
                  <p className="text-[14px] font-medium text-foreground truncate">{service.name}</p>
                </div>
                <div className="col-span-4">
                  <p className="text-[13px] text-muted-foreground truncate">{service.description || '-'}</p>
                </div>
                <div className="col-span-2">
                  <Switch checked={service.is_active} onCheckedChange={() => handleToggleActive(service)} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg p-2">
                      <DropdownMenuItem onClick={() => handleEdit(service)} className="rounded-lg px-3 py-2.5 cursor-pointer"><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(service)} className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AlertDialog
        open={deleteConfirmModal.isOpen}
        onOpenChange={(open) => setDeleteConfirmModal({ isOpen: open, service: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{deleteConfirmModal.service?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
