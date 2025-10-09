import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ticketSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  department_id: z.string().min(1, 'Departamento é obrigatório'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: z.string().min(5, 'Assunto deve ter no mínimo 5 caracteres').max(200),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewTicketModal({ open, onOpenChange, onSuccess }: NewTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'medium',
      subject: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchDepartments();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, company_name, email')
      .eq('is_active', true)
      .order('full_name');
    setClients(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, color')
      .eq('is_active', true)
      .order('name');
    setDepartments(data || []);
  };

  const onSubmit = async (data: TicketFormData) => {
    try {
      setLoading(true);

      const payload: any = {
        client_id: data.client_id,
        department_id: data.department_id,
        priority: data.priority,
        subject: data.subject,
        description: data.description,
        created_by: user?.id,
        status: 'open',
      };

      const { error } = await supabase.from('tickets').insert([payload]);

      if (error) throw error;

      toast({
        title: 'Ticket criado',
        description: 'Ticket criado com sucesso.',
      });

      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro ao criar ticket',
        description: 'Não foi possível criar o ticket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Ticket de Suporte</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div>
            <Label htmlFor="client_id">Cliente *</Label>
            <Select
              value={form.watch('client_id')}
              onValueChange={(value) => form.setValue('client_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name || client.company_name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.client_id && (
              <p className="text-sm text-error mt-1">
                {form.formState.errors.client_id.message}
              </p>
            )}
          </div>

          {/* Department and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department_id">Departamento *</Label>
              <Select
                value={form.watch('department_id')}
                onValueChange={(value) => form.setValue('department_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department_id && (
                <p className="text-sm text-error mt-1">
                  {form.formState.errors.department_id.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="priority">Prioridade *</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value: any) => form.setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              {...form.register('subject')}
              placeholder="Breve descrição do problema"
            />
            {form.formState.errors.subject && (
              <p className="text-sm text-error mt-1">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Descreva o problema em detalhes..."
              rows={6}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-error mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
