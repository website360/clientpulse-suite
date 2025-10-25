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
  responsible_name: string | null;
  client_type: 'person' | 'company';
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
    contract_period: '',
    status: 'pending_signature',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    fetchClients();
    fetchServices();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    if (contract) {
      // Calcular o período baseado nas datas
      let period = '';
      if (contract.start_date && contract.end_date) {
        const start = new Date(contract.start_date);
        const end = new Date(contract.end_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        
        if (months === 0) period = 'single';
        else if (months === 1) period = 'monthly';
        else if (months === 12) period = 'annual';
        else if (months === 24) period = 'biannual';
      }
      
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
        contract_period: period,
        status: contract.status || 'pending_signature',
      });
    } else {
      setFormData({
        client_id: '',
        service_id: '',
        amount: '',
        payment_method_id: '',
        payment_terms: '',
        start_date: '',
        contract_period: '',
        status: 'pending_signature',
      });
    }
  }, [contract]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, company_name, responsible_name, client_type')
      .eq('is_active', true)
      .order('responsible_name', { nullsFirst: false });
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

      // Calcular end_date baseado no período
      let end_date = null;
      if (formData.start_date && formData.contract_period) {
        const start = new Date(formData.start_date);
        const monthsToAdd = {
          single: 0,
          monthly: 1,
          annual: 12,
          biannual: 24,
        }[formData.contract_period] || 0;
        
        if (monthsToAdd > 0) {
          const end = new Date(start);
          end.setMonth(end.getMonth() + monthsToAdd);
          end_date = end.toISOString().split('T')[0];
        } else {
          // Para pagamento único, end_date é igual a start_date
          end_date = formData.start_date;
        }
      }

      const payload = {
        client_id: formData.client_id,
        service_id: formData.service_id,
        amount: parseFloat(formData.amount.replace(/\./g, '').replace(',', '.')),
        payment_method_id: formData.payment_method_id || null,
        payment_terms: formData.payment_terms || null,
        start_date: formData.start_date,
        end_date,
        status: formData.status,
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
                    {client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name)}
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
          </div>

          <div>
            <Label htmlFor="payment_terms">Condições de Pagamento</Label>
            <Input
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="Ex: 12x, à vista, entrada + 11x"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="contract_period">Período do Contrato *</Label>
              <Select
                value={formData.contract_period}
                onValueChange={(value) => setFormData({ ...formData, contract_period: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Pagamento único</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="biannual">Bi-anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <SelectItem value="pending_signature">Assinatura</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="expiring">A Vencer</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
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
