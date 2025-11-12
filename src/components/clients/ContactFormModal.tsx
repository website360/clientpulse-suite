import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskPhone, maskCpfCnpj, maskDate } from '@/lib/masks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast, toastSuccess, toastError } from '@/hooks/use-toast';

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
    phone: '',
    cpf: '',
    birth_date: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        department: contact.department || '',
        email: contact.email || '',
        phone: contact.phone || '',
        cpf: contact.cpf || '',
        birth_date: contact.birth_date ? new Date(contact.birth_date).toLocaleDateString('pt-BR') : '',
      });
    } else {
      setFormData({
        name: '',
        department: '',
        email: '',
        phone: '',
        cpf: '',
        birth_date: '',
      });
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar dados para salvar
      const dataToSave: any = {
        name: formData.name,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        cpf: formData.cpf || null,
      };

      // Converter data de nascimento se fornecida
      if (formData.birth_date) {
        const parts = formData.birth_date.split('/');
        if (parts.length === 3) {
          dataToSave.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      } else {
        dataToSave.birth_date = null;
      }

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('client_contacts')
          .update(dataToSave)
          .eq('id', contact.id);

        if (error) throw error;

        toastSuccess('Contato atualizado', 'O contato foi atualizado com sucesso.');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('client_contacts')
          .insert([{ ...dataToSave, client_id: clientId }]);

        if (error) throw error;

        toastSuccess('Contato criado', 'O contato foi criado com sucesso.');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      toastError('Erro ao salvar', 'Não foi possível salvar o contato.');
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

          <div>
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Necessário para receber notificações no WhatsApp
            </p>
          </div>

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: maskCpfCnpj(e.target.value) })}
              maxLength={14}
            />
          </div>

          <div>
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              placeholder="DD/MM/AAAA"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: maskDate(e.target.value) })}
              maxLength={10}
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
