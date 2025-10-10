import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract?: any;
}

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

export function ContractFormModal({ isOpen, onClose, onSuccess, contract }: ContractFormModalProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    amount: '',
    payment_method_id: '',
    payment_terms: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    fetchClients();
    fetchServices();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    if (contract) {
      setFormData({
        client_id: contract.client_id || '',
        service_id: contract.service_id || '',
        amount: Number(contract.amount).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        payment_method_id: contract.payment_method_id || '',
        payment_terms: contract.payment_terms || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        status: contract.status || 'active',
      });
    } else {
      setFormData({
        client_id: '',
        service_id: '',
        amount: '',
        payment_method_id: '',
        payment_terms: '',
        start_date: '',
        end_date: '',
        status: 'active',
      });
    }
  }, [contract]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, company_name')
      .eq('is_active', true)
      .order('full_name');
    setClients(data || []);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setServices(data || []);
  };

  const fetchPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setPaymentMethods(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para ter os centavos
    const number = Number(digits) / 100;
    
    // Formata como moeda brasileira
    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setFormData({ ...formData, amount: formatted });
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachmentFile) return null;

    const fileExt = attachmentFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('contract-attachments')
      .upload(filePath, attachmentFile);

    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);

    try {
      let attachment_url = contract?.attachment_url;

      if (attachmentFile) {
        attachment_url = await uploadAttachment();
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount.replace(/\./g, '').replace(',', '.')),
        attachment_url,
        created_by: user.id,
      };

      if (contract) {
        const { error } = await supabase
          .from('contracts')
          .update(payload)
          .eq('id', contract.id);

        if (error) throw error;
        toast.success('Contrato atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('contracts')
          .insert(payload);

        if (error) throw error;
        toast.success('Contrato criado com sucesso');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar contrato');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
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
                      {client.full_name || client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="service_id">Serviço *</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Valor *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  className="pl-10"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment_method_id">Meio de Pagamento</Label>
              <Select
                value={formData.payment_method_id}
                onValueChange={(value) => setFormData({ ...formData, payment_method_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">Data de Término</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="payment_terms">Condições de Pagamento</Label>
            <Textarea
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="attachment">Anexo do Contrato</Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachment"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {contract?.attachment_url && !attachmentFile && (
              <p className="text-xs text-muted-foreground mt-1">Arquivo atual anexado</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
