import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact?: any;
  onSuccess: () => void;
}

export function ContactFormModal({
  open,
  onOpenChange,
  clientId,
  contact,
  onSuccess,
}: ContactFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    email: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        department: contact.department || '',
        email: contact.email || '',
      });
    } else {
      setFormData({
        name: '',
        department: '',
        email: '',
      });
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('client_contacts')
          .update(formData)
          .eq('id', contact.id);

        if (error) throw error;

        toast({
          title: 'Contato atualizado',
          description: 'O contato foi atualizado com sucesso.',
        });
      } else {
        // Create new contact
        const { error } = await supabase
          .from('client_contacts')
          .insert([{ ...formData, client_id: clientId }]);

        if (error) throw error;

        toast({
          title: 'Contato criado',
          description: 'O contato foi criado com sucesso.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o contato.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do contato
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : contact ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
