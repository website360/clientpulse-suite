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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const clientSchema = z.object({
  client_type: z.enum(['person', 'company']),
  full_name: z.string().max(200).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  cpf_cnpj: z.string().optional().nullable(),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  responsible_name: z.string().optional().nullable(),
  birth_date: z.date().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  address_cep: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_number: z.string().optional().nullable(),
  address_complement: z.string().optional().nullable(),
  address_neighborhood: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.client_type === 'person' && (!data.full_name || data.full_name.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nome é obrigatório',
      path: ['full_name'],
    });
  }
  if (data.client_type === 'company' && (!data.company_name || data.company_name.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Razão Social é obrigatória',
      path: ['company_name'],
    });
  }
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: any;
  onSuccess: () => void;
}

export function ClientFormModal({ open, onOpenChange, client, onSuccess }: ClientFormModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const { toast } = useToast();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_type: 'person',
      full_name: '',
      email: '',
      phone: '',
    },
  });

  const clientType = form.watch('client_type');

  useEffect(() => {
    if (client && open) {
      form.reset({
        client_type: client.client_type,
        full_name: client.full_name || '',
        company_name: client.company_name || '',
        cpf_cnpj: client.cpf_cnpj || '',
        email: client.email,
        phone: client.phone,
        responsible_name: client.responsible_name || '',
        birth_date: client.birth_date ? new Date(client.birth_date) : undefined,
        gender: client.gender || undefined,
        address_cep: client.address_cep || '',
        address_street: client.address_street || '',
        address_number: client.address_number || '',
        address_complement: client.address_complement || '',
        address_neighborhood: client.address_neighborhood || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
      });
    } else if (open) {
      form.reset({
        client_type: 'person',
        full_name: '',
        company_name: '',
        cpf_cnpj: '',
        email: '',
        phone: '',
        responsible_name: '',
        birth_date: undefined,
        gender: undefined,
        address_cep: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
      });
    }
    if (open) {
      setStep(1);
    }
  }, [client, open]);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue('address_street', data.logradouro);
        form.setValue('address_neighborhood', data.bairro);
        form.setValue('address_city', data.localidade);
        form.setValue('address_state', data.uf);
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
    } finally {
      setFetchingCep(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      setLoading(true);

      const payload: any = {
        client_type: data.client_type,
        full_name: data.client_type === 'person' ? data.full_name : null,
        company_name: data.client_type === 'company' ? data.company_name : null,
        cpf_cnpj: data.cpf_cnpj || null,
        email: data.email,
        phone: data.phone,
        responsible_name: data.responsible_name || null,
        gender: data.gender || null,
        birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : null,
        address_cep: data.address_cep || null,
        address_street: data.address_street || null,
        address_number: data.address_number || null,
        address_complement: data.address_complement || null,
        address_neighborhood: data.address_neighborhood || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id);

        if (error) throw error;

        toast({
          title: 'Cliente atualizado',
          description: 'Cliente atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase.from('clients').insert([payload]);

        if (error) throw error;

        toast({
          title: 'Cliente cadastrado',
          description: 'Cliente cadastrado com sucesso.',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro ao salvar cliente',
        description: 'Não foi possível salvar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fields = getFieldsForStep(step);
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  const getFieldsForStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return clientType === 'person'
          ? ['client_type', 'full_name', 'cpf_cnpj']
          : ['client_type', 'company_name', 'cpf_cnpj', 'responsible_name'];
      case 2:
        return ['email', 'phone'];
      case 3:
        return ['birth_date', 'gender'];
      case 4:
        return ['address_cep', 'address_street', 'address_number'];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={cn(
                  'h-2 rounded-full transition-colors',
                  s <= step ? 'bg-primary' : 'bg-muted',
                  s < 4 ? 'flex-1' : 'w-8'
                )}
              />
              {s < 4 && <div className="w-2" />}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de Cliente</Label>
                <RadioGroup
                  value={form.watch('client_type')}
                  onValueChange={(value: any) => form.setValue('client_type', value)}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="person" id="person" />
                    <Label htmlFor="person" className="cursor-pointer">Pessoa Física</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="company" />
                    <Label htmlFor="company" className="cursor-pointer">Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>

              {clientType === 'person' ? (
                <>
                  <div>
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      {...form.register('full_name')}
                      placeholder="João Silva"
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-sm text-error mt-1">
                        {form.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cpf_cnpj">CPF</Label>
                    <Input
                      id="cpf_cnpj"
                      {...form.register('cpf_cnpj')}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="company_name">Razão Social *</Label>
                    <Input
                      id="company_name"
                      {...form.register('company_name')}
                      placeholder="Empresa LTDA"
                    />
                    {form.formState.errors.company_name && (
                      <p className="text-sm text-error mt-1">
                        {form.formState.errors.company_name.message}
                      </p>
                    )}
                    {form.formState.errors.full_name && (
                      <p className="text-sm text-error mt-1">
                        {form.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cpf_cnpj">CNPJ</Label>
                    <Input
                      id="cpf_cnpj"
                      {...form.register('cpf_cnpj')}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsible_name">Nome do Responsável</Label>
                    <Input
                      id="responsible_name"
                      {...form.register('responsible_name')}
                      placeholder="João Silva"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="cliente@email.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-error mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-error mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Personal Data */}
          {step === 3 && clientType === 'person' && (
            <div className="space-y-4">
              <div>
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('birth_date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('birth_date') ? (
                        format(form.watch('birth_date')!, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('birth_date')}
                      onSelect={(date) => form.setValue('birth_date', date)}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="gender">Gênero</Label>
                <Select
                  value={form.watch('gender')}
                  onValueChange={(value: any) => form.setValue('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Address */}
          {step === (clientType === 'person' ? 4 : 3) && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="address_cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="address_cep"
                    {...form.register('address_cep')}
                    placeholder="00000-000"
                    maxLength={9}
                    onBlur={(e) => fetchAddressByCep(e.target.value)}
                  />
                  {fetchingCep && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address_street">Endereço</Label>
                  <Input
                    id="address_street"
                    {...form.register('address_street')}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div>
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    {...form.register('address_number')}
                    placeholder="123"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  {...form.register('address_complement')}
                  placeholder="Apto, Sala..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    {...form.register('address_neighborhood')}
                  />
                </div>
                <div>
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input id="address_city" {...form.register('address_city')} />
                </div>
                <div>
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    {...form.register('address_state')}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
            {step < (clientType === 'person' ? 4 : 3) ? (
              <Button type="button" onClick={nextStep} className="ml-auto">
                Próximo
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="ml-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {client ? 'Atualizar' : 'Cadastrar'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
