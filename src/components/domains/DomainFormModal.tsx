import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
}

interface Domain {
  id: string;
  domain: string;
  expires_at: string;
  owner: 'agency' | 'client';
  client_id: string;
}

interface DomainFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  domain?: Domain;
}

export function DomainFormModal({ isOpen, onClose, onSuccess, domain }: DomainFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    domain: '',
    client_id: '',
    expires_at: new Date(),
    owner: 'client' as 'agency' | 'client',
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (domain) {
        setFormData({
          domain: domain.domain,
          client_id: domain.client_id,
          expires_at: new Date(domain.expires_at),
          owner: domain.owner,
        });
      } else {
        setFormData({
          domain: '',
          client_id: '',
          expires_at: new Date(),
          owner: 'client',
        });
      }
    }
  }, [isOpen, domain]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, company_name')
        .eq('is_active', true)
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const domainData = {
        domain: formData.domain,
        client_id: formData.client_id,
        expires_at: format(formData.expires_at, 'yyyy-MM-dd'),
        owner: formData.owner,
        created_by: user?.id,
      };

      if (domain) {
        const { error } = await supabase
          .from('domains')
          .update(domainData)
          .eq('id', domain.id);

        if (error) throw error;
        toast.success('Domínio atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('domains')
          .insert([domainData]);

        if (error) throw error;
        toast.success('Domínio cadastrado com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error('Erro ao salvar domínio');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (client: Client) => {
    return client.company_name || client.full_name || 'Cliente sem nome';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{domain ? 'Editar Domínio' : 'Novo Domínio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {getClientName(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domínio *</Label>
            <Input
              id="domain"
              type="text"
              placeholder="exemplo.com.br"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.expires_at && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expires_at ? (
                    format(formData.expires_at, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expires_at}
                  onSelect={(date) => date && setFormData({ ...formData, expires_at: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Proprietário *</Label>
            <Select
              value={formData.owner}
              onValueChange={(value: 'agency' | 'client') => 
                setFormData({ ...formData, owner: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agency">Agência</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : domain ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
