import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toastSuccess, toastError } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse } from 'date-fns';
import { maskDate, parseDateBR, formatDateBR } from '@/lib/masks';

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
  responsible_name: string | null;
  client_type: 'person' | 'company';
}

interface Domain {
  id: string;
  domain: string;
  expires_at: string;
  owner: 'agency' | 'client';
  client_id: string;
  is_cloudflare?: boolean;
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
  const [key, setKey] = useState(0);
  
  const [formData, setFormData] = useState({
    domain: '',
    client_id: '',
    expires_at: '',
    owner: 'client' as 'agency' | 'client',
    is_cloudflare: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setKey(prev => prev + 1); // Force re-render do Select
      if (domain) {
        setFormData({
          domain: domain.domain,
          client_id: domain.client_id,
          expires_at: formatDateBR(parse(domain.expires_at, 'yyyy-MM-dd', new Date())),
          owner: domain.owner,
          is_cloudflare: domain.is_cloudflare || false,
        });
      } else {
        setFormData({
          domain: '',
          client_id: '',
          expires_at: '',
          owner: 'client',
          is_cloudflare: false,
        });
      }
    }
  }, [isOpen, domain]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, company_name, responsible_name, client_type')
        .eq('is_active', true)
        .order('responsible_name', { nullsFirst: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toastError('Erro ao carregar clientes', 'Não foi possível carregar a lista de clientes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar data
    const parsedDate = parseDateBR(formData.expires_at);
    if (!parsedDate) {
      toastError('Data inválida', 'Use o formato DD/MM/AAAA');
      return;
    }

    // Validar client_id
    if (!formData.client_id) {
      toastError('Cliente obrigatório', 'Selecione um cliente');
      return;
    }

    setLoading(true);

    try {
      const domainData = {
        domain: formData.domain,
        client_id: formData.client_id,
        expires_at: format(parsedDate, 'yyyy-MM-dd'),
        owner: formData.owner,
        is_cloudflare: formData.is_cloudflare,
        ...(domain ? {} : { created_by: user?.id })
      };

      if (domain) {
        const { error } = await supabase
          .from('domains')
          .update(domainData)
          .eq('id', domain.id);

        if (error) throw error;
        toastSuccess('Domínio atualizado', 'Domínio atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('domains')
          .insert([{ ...domainData, created_by: user?.id }]);

        if (error) throw error;
        toastSuccess('Domínio cadastrado', 'Domínio cadastrado com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving domain:', error);
      toastError('Erro ao salvar', 'Não foi possível salvar o domínio');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (client: Client) => {
    return client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name) || 'Cliente sem nome';
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
              key={`client-${key}`}
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
            <Label htmlFor="expires_at">Data de Vencimento *</Label>
            <Input
              id="expires_at"
              type="text"
              placeholder="DD/MM/AAAA"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: maskDate(e.target.value) })}
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Proprietário *</Label>
            <Select
              key={`owner-${key}`}
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

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="is-cloudflare">Cloudflare</Label>
              <p className="text-sm text-muted-foreground">
                Domínio gerenciado pela Cloudflare
              </p>
            </div>
            <Switch
              id="is-cloudflare"
              checked={formData.is_cloudflare}
              onCheckedChange={(checked) => setFormData({ ...formData, is_cloudflare: checked })}
            />
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
