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
import { toastSuccess, toastError } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileUpload } from './FileUpload';
import { EmojiPicker } from '@/components/shared/EmojiPicker';

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
  onSuccess?: () => void;
  preSelectedClientId?: string;
}

// Helper to get client display name
const getClientDisplayName = (client: any) => {
  return client.responsible_name || 
    (client.client_type === 'company' ? client.company_name : client.full_name) || 
    client.email || 
    'Cliente';
};

export function NewTicketModal({ open, onOpenChange, onSuccess, preSelectedClientId }: NewTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isContact, setIsContact] = useState(false);
  const [contactClientId, setContactClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const { user, userRole } = useAuth();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      client_id: '',
      department_id: '',
      priority: 'medium',
      subject: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (preSelectedClientId) {
        // Handle pre-selected client
        fetchClientById(preSelectedClientId);
        fetchDepartments();
      } else {
        // Normal flow: check if contact, then fetch departments
        checkIfContact();
        fetchDepartments();
      }
    }
  }, [open, preSelectedClientId]);

  const fetchClientById = async (clientId: string) => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, full_name, company_name, email, responsible_name, client_type')
        .eq('id', clientId)
        .maybeSingle();

      if (clientData) {
        setClients([clientData]);
        form.setValue('client_id', clientData.id, { shouldValidate: true });
        setSelectedClientName(getClientDisplayName(clientData));
      }
    } catch (e) {
      console.error('Error fetching client:', e);
    }
  };

  const checkIfContact = async () => {
    try {
      // Detect contact by presence in client_contacts (do not rely on role label)
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (contactData?.client_id) {
        setIsContact(true);
        setContactClientId(contactData.client_id);

        // Fetch the client's info to display
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, full_name, company_name, email, responsible_name, client_type')
          .eq('id', contactData.client_id)
          .maybeSingle();

        if (clientData) {
          setClients([clientData]);
          form.setValue('client_id', clientData.id, { shouldValidate: true });
          setSelectedClientName(getClientDisplayName(clientData));
        }
      } else {
        setIsContact(false);
        fetchClients();
      }
    } catch (e) {
      setIsContact(false);
      fetchClients();
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, company_name, email, responsible_name, client_type')
      .eq('is_active', true)
      .order('responsible_name', { nullsFirst: false });
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
        status: 'waiting',
      };

      const { data: ticketData, error } = await supabase
        .from('tickets')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (attachments.length > 0 && ticketData) {
        await uploadAttachments(ticketData.id, attachments);
      }

      toastSuccess(
        'Ticket criado com sucesso',
        `Ticket criado e notificações enviadas.`
      );

      form.reset();
      setAttachments([]);
      
      // Send notification using configured templates
      if (ticketData) {
        try {
          // Get client and department names for template variables
          const { data: clientData } = await supabase
            .from('clients')
            .select('full_name, company_name, email, phone, responsible_name, client_type')
            .eq('id', ticketData.client_id)
            .single();

          const { data: departmentData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', ticketData.department_id)
            .single();

          const priorityLabels = {
            low: 'Baixa',
            medium: 'Média',
            high: 'Alta',
            urgent: 'Urgente'
          };

          const priorityEmojis = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            urgent: '🔴'
          };

          const clientName = getClientDisplayName(clientData);
          const priorityLabel = priorityLabels[ticketData.priority as keyof typeof priorityLabels];
          const priorityEmoji = priorityEmojis[ticketData.priority as keyof typeof priorityEmojis];

          // Call send-notification with all template variables
          await supabase.functions.invoke('send-notification', {
            body: {
              event_type: 'ticket_created',
              data: {
                ticket_number: ticketData.ticket_number,
                ticket_id: ticketData.id,
                client_name: clientName,
                client_email: clientData?.email || undefined,
                client_phone: clientData?.phone || undefined,
                department_name: departmentData?.name || 'N/A',
                subject: ticketData.subject,
                priority: priorityLabel,
                priority_emoji: priorityEmoji,
                description: ticketData.description,
                created_at: new Date().toLocaleString('pt-BR'),
              },
              reference_type: 'ticket',
              reference_id: ticketData.id,
            },
          });

          console.log('Notification sent via configured templates');
        } catch (err) {
          console.error('Error sending notification:', err);
        }
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toastError('Erro ao criar ticket', 'Não foi possível criar o ticket.');
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachments = async (ticketId: string, files: File[]) => {
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        await supabase.from('ticket_attachments').insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toastError('Erro ao enviar anexos', 'Alguns arquivos não puderam ser enviados.');
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
            {(isContact || !!preSelectedClientId) ? (
              <Input
                value={selectedClientName || 'Carregando...'}
                disabled
                className="bg-muted"
              />
            ) : (
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
                      {getClientDisplayName(client)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Descrição *</Label>
              <EmojiPicker 
                onEmojiSelect={(emoji) => {
                  const textarea = document.getElementById('description') as HTMLTextAreaElement;
                  const currentValue = form.getValues('description') || '';
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const newValue = currentValue.substring(0, start) + emoji + currentValue.substring(end);
                  form.setValue('description', newValue);
                  // Restore cursor position after emoji insertion
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + emoji.length, start + emoji.length);
                  }, 0);
                }}
              />
            </div>
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

          {/* File Upload */}
          <div>
            <Label>Anexos</Label>
            <FileUpload
              onFilesChange={setAttachments}
              maxSizeMB={1}
              multiple={true}
            />
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
