import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCachedClients } from '@/hooks/useCachedClients';
import { Plus, Trash2 } from 'lucide-react';

interface ProposalFormModalProps {
  open: boolean;
  onClose: () => void;
  proposal?: any;
  onSuccess: () => void;
}

interface ServiceItem {
  service_id: string;
  custom_name: string;
  description: string;
  price: string;
}

interface PageItem {
  elements: any[];
}

export function ProposalFormModal({ open, onClose, proposal, onSuccess }: ProposalFormModalProps) {
  const { user } = useAuth();
  const { data: clients } = useCachedClients();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    validity_days: '30',
    notes: '',
  });

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
    { service_id: '', custom_name: '', description: '', price: '' }
  ]);

  const [pageItems, setPageItems] = useState<PageItem[]>([
    { elements: [] }
  ]);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name');
      
      if (data) setServices(data);
    };

    if (open) {
      fetchServices();
    }
  }, [open]);

  useEffect(() => {
    if (proposal) {
      setFormData({
        title: proposal.title || '',
        client_id: proposal.client_id || '',
        validity_days: proposal.validity_days?.toString() || '30',
        notes: proposal.notes || '',
      });
    } else {
      setFormData({
        title: '',
        client_id: '',
        validity_days: '30',
        notes: '',
      });
      setServiceItems([{ service_id: '', custom_name: '', description: '', price: '' }]);
      setPageItems([{ elements: [] }]);
    }
  }, [proposal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.client_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (serviceItems.filter(s => s.custom_name && s.price).length === 0) {
      toast.error('Adicione pelo menos um serviço');
      return;
    }

    setLoading(true);

    try {
      const proposalData = {
        title: formData.title,
        client_id: formData.client_id,
        created_by: user?.id,
        validity_days: parseInt(formData.validity_days) || 30,
        notes: formData.notes || null,
        status: 'draft',
        company_data: {},
      };

      let proposalId = proposal?.id;

      if (proposal) {
        const { error } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', proposal.id);

        if (error) throw error;

        // Delete existing services and pages
        await supabase.from('proposal_services').delete().eq('proposal_id', proposal.id);
        await supabase.from('proposal_pages').delete().eq('proposal_id', proposal.id);
      } else {
        const { data, error } = await supabase
          .from('proposals')
          .insert(proposalData)
          .select()
          .single();

        if (error) throw error;
        proposalId = data.id;
      }

      // Insert services
      const validServices = serviceItems.filter(s => s.custom_name && s.price);
      if (validServices.length > 0) {
        const servicesData = validServices.map((service, index) => ({
          proposal_id: proposalId,
          service_id: service.service_id || null,
          custom_name: service.custom_name,
          description: service.description || null,
          price: parseFloat(service.price),
          service_order: index + 1,
        }));

        const { error } = await supabase.from('proposal_services').insert(servicesData);
        if (error) throw error;
      }

      // Insert pages
      if (pageItems.length > 0) {
        const pagesData = pageItems.map((page, index) => ({
          proposal_id: proposalId,
          page_order: index + 1,
          background_type: 'color',
          background_value: '#ffffff',
          elements: page.elements || [],
        }));

        const { error } = await supabase.from('proposal_pages').insert(pagesData);
        if (error) throw error;
      }

      toast.success(proposal ? 'Proposta atualizada com sucesso' : 'Proposta criada com sucesso');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Erro ao salvar proposta');
    } finally {
      setLoading(false);
    }
  };

  const addServiceItem = () => {
    setServiceItems([...serviceItems, { service_id: '', custom_name: '', description: '', price: '' }]);
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill name and price when service is selected
    if (field === 'service_id' && value) {
      const service = services.find(s => s.id === value);
      if (service) {
        if (!updated[index].custom_name) {
          updated[index].custom_name = service.name;
        }
        if (service.price && !updated[index].price) {
          updated[index].price = service.price.toString();
        }
      }
    }
    
    setServiceItems(updated);
  };

  const addPageItem = () => {
    setPageItems([...pageItems, { elements: [] }]);
  };

  const removePageItem = (index: number) => {
    setPageItems(pageItems.filter((_, i) => i !== index));
  };

  const updatePageItem = (index: number, field: keyof PageItem, value: any) => {
    const updated = [...pageItems];
    updated[index] = { ...updated[index], [field]: value };
    setPageItems(updated);
  };

  const calculateTotal = () => {
    return serviceItems.reduce((sum, item) => {
      if (item.price) {
        return sum + parseFloat(item.price);
      }
      return sum;
    }, 0);
  };

  const getClientLabel = (client: any) => {
    if (client.client_type === 'company') {
      return client.company_name || client.responsible_name;
    }
    return client.full_name || client.responsible_name;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {proposal ? 'Editar Proposta' : 'Nova Proposta'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Dados Gerais</TabsTrigger>
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="pages">Páginas</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome da proposta"
                  required
                />
              </div>

              <div>
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {getClientLabel(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="validity_days">Validade (dias)</Label>
                <Input
                  id="validity_days"
                  type="number"
                  min="1"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações internas"
                  rows={3}
                />
              </div>

              {serviceItems.filter(s => s.custom_name && s.price).length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Resumo Financeiro</div>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(calculateTotal())}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              {serviceItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Serviço {index + 1}</Label>
                    {serviceItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServiceItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`service_${index}`}>Serviço (Opcional)</Label>
                    <Select
                      value={item.service_id}
                      onValueChange={(value) => updateServiceItem(index, 'service_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione para preencher automático" />
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
                    <Label htmlFor={`custom_name_${index}`}>Nome do Serviço *</Label>
                    <Input
                      id={`custom_name_${index}`}
                      value={item.custom_name}
                      onChange={(e) => updateServiceItem(index, 'custom_name', e.target.value)}
                      placeholder="Ex: Desenvolvimento de Website"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor={`description_${index}`}>Descrição</Label>
                    <Textarea
                      id={`description_${index}`}
                      value={item.description}
                      onChange={(e) => updateServiceItem(index, 'description', e.target.value)}
                      placeholder="Descrição detalhada do serviço"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`price_${index}`}>Valor Total *</Label>
                    <Input
                      id={`price_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateServiceItem(index, 'price', e.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </div>

                  {item.price && (
                    <div className="text-right font-semibold">
                      Valor: {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(parseFloat(item.price))}
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addServiceItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Serviço
              </Button>
            </TabsContent>

            <TabsContent value="pages" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                As páginas personalizadas serão adicionadas à proposta. Funcionalidade de edição visual em breve.
              </div>

              <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                <p>Editor visual de páginas em desenvolvimento</p>
                <p className="text-sm mt-2">As páginas padrão serão geradas automaticamente com base nos serviços</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : proposal ? 'Atualizar' : 'Criar Proposta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
