import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useToast, toastSuccess, toastError } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  issue_date: z.date({
    required_error: "Data de emissão é obrigatória",
  }),
  due_date: z.date().optional(),
  occurrence_type: z.enum(['unica', 'mensal', 'trimestral', 'semestral', 'anual', 'parcelada']),
  due_day: z.number().min(1).max(31).optional(),
  installments: z.number().min(1).optional(),
  payment_method: z.string().optional(),
  credit_card_installments: z.number().min(1).max(12).optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.occurrence_type === 'unica') {
    return data.due_date !== undefined;
  }
  if (['mensal', 'trimestral', 'semestral', 'anual', 'parcelada'].includes(data.occurrence_type)) {
    return data.due_date !== undefined && data.due_day !== undefined;
  }
  return true;
}, {
  message: "Preencha todos os campos obrigatórios para o tipo de ocorrência selecionado",
});

// Helper function to format date without timezone issues
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseCurrency = (val: any): number => {
  if (typeof val === 'number') return Number(val.toFixed(2));
  if (!val) return 0;
  const normalized = String(val).replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number((isNaN(num) ? 0 : num).toFixed(2));
};

// Função para calcular taxas de cartão de crédito
const calculateCreditCardFees = (amount: number, installments: number) => {
  // Taxa fixa: 2,99% + R$ 0,49
  const fixedFeePercent = 0.0299;
  const fixedFeeAmount = 0.49;
  
  // Taxa de antecipação: 1,6% ao mês
  const anticipationFeePerMonth = 0.016;
  
  // Calcula taxa fixa
  const fixedFee = (amount * fixedFeePercent) + fixedFeeAmount;
  
  // Calcula taxa de antecipação (apenas se parcelado)
  let anticipationFee = 0;
  if (installments > 1) {
    // Taxa de antecipação é aplicada sobre o valor + taxa fixa, multiplicado pelos meses
    anticipationFee = (amount + fixedFee) * anticipationFeePerMonth * (installments - 1);
  }
  
  const totalFees = fixedFee + anticipationFee;
  const totalAmount = amount + totalFees;
  const installmentValue = totalAmount / installments;
  
  return {
    fixedFee,
    anticipationFee,
    totalFees,
    totalAmount,
    installmentValue,
  };
};

interface ReceivableFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: any;
  onSuccess?: (account?: any, isRecurring?: boolean) => void;
}

export function ReceivableFormModal({ open, onOpenChange, account, onSuccess }: ReceivableFormModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncWithAsaas, setSyncWithAsaas] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [creditCardInstallments, setCreditCardInstallments] = useState<number>(1);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch payment categories for receivable
  const { data: categories } = useQuery({
    queryKey: ["payment-categories", "receivable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_categories")
        .select("*")
        .eq("type", "receivable")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch Asaas settings to check if integration is active
  const { data: asaasSettings } = useQuery({
    queryKey: ["asaas-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_settings")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: '',
      description: '',
      category: '',
      amount: '',
      occurrence_type: 'unica',
      payment_method: '',
      credit_card_installments: 1,
      invoice_number: '',
      notes: '',
    },
  });

  const occurrenceType = form.watch('occurrence_type');

  useEffect(() => {
    if (open) {
      fetchClients();
      if (account) {
        // Parse dates correctly to avoid timezone issues
        const parseDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };
        
        form.reset({
          client_id: account.client_id,
          description: account.description,
          category: account.category,
          amount: account.amount.toString(),
          issue_date: account.issue_date ? parseDate(account.issue_date) : new Date(),
          due_date: account.due_date ? parseDate(account.due_date) : undefined,
          occurrence_type: (account.occurrence_type as any) || 'unica',
          due_day: account.due_day || undefined,
          installments: account.installments || undefined,
          payment_method: account.payment_method || '',
          invoice_number: account.invoice_number || '',
          notes: account.notes || '',
        });
      } else {
        form.reset({
          occurrence_type: 'unica',
        });
      }
    }
  }, [open, account]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, company_name, responsible_name, client_type')
      .eq('is_active', true)
      .order('responsible_name', { nullsFirst: false });
    
    setClients(data || []);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const baseReceivableData = {
        client_id: values.client_id,
        description: values.description,
        category: values.category,
        created_by: user?.id!,
        payment_method: values.payment_method || null,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
        occurrence_type: values.occurrence_type,
        due_day: values.due_day || null,
        installments: values.installments || null,
        issue_date: formatDateToString(values.issue_date),
      };

      if (account) {
        // Edição - caso recorrente sem escolha prévia, fechar e pedir ação em massa
        const isRecurring = account.occurrence_type !== 'unica';
        const bulkActionType = account.bulkActionType as 'single' | 'following' | 'all' | undefined;

        if (isRecurring && !bulkActionType) {
          form.reset();
          onOpenChange(false);
          if (onSuccess) onSuccess(values, true);
          return;
        }

        const selected = bulkActionType || 'single';
        
        if (selected === 'single') {
          const { error } = await supabase
            .from('accounts_receivable')
            .update({
              ...baseReceivableData,
              amount: parseCurrency(values.amount),
              due_date: values.due_date ? formatDateToString(values.due_date) : formatDateToString(values.issue_date),
            })
            .eq('id', account.id);

          if (error) throw error;
        } else if (selected === 'following') {
          // Update this and following occurrences
          const { error } = await supabase
            .from('accounts_receivable')
            .update({
              ...baseReceivableData,
              amount: parseCurrency(values.amount),
              due_date: values.due_date ? formatDateToString(values.due_date) : formatDateToString(values.issue_date),
            })
            .eq('parent_receivable_id', account.parent_receivable_id || account.id)
            .gte('due_date', account.due_date);

          if (error) throw error;
        } else if (selected === 'all') {
          // Update all occurrences
          const parentId = account.parent_receivable_id || account.id;
          const { error } = await supabase
            .from('accounts_receivable')
            .update({
              ...baseReceivableData,
              amount: parseCurrency(values.amount),
              due_date: values.due_date ? formatDateToString(values.due_date) : formatDateToString(values.issue_date),
            })
            .or(`id.eq.${parentId},parent_receivable_id.eq.${parentId}`);

          if (error) throw error;
        }

        toast({
          title: 'Sucesso',
          description: 'Conta atualizada com sucesso',
        });
      } else {
        // Nova cobrança - gera múltiplas se necessário
        if (values.occurrence_type === 'unica') {
          // Cobrança única
          const { error } = await supabase
            .from('accounts_receivable')
            .insert([{
              ...baseReceivableData,
              amount: parseFloat(values.amount),
              due_date: formatDateToString(values.due_date!),
            }]);

          if (error) throw error;

          toast({
            title: 'Sucesso',
            description: 'Conta a receber cadastrada com sucesso',
          });
        } else if (values.occurrence_type === 'parcelada') {
          // Cobrança parcelada - primeira cobrança será o parent
          const totalAmount = parseFloat(values.amount);
          const installments = values.installments!;
          const amountPerInstallment = totalAmount / installments;
          
          // Create first installment as parent
          const firstDueDate = new Date(values.due_date!);
          firstDueDate.setDate(values.due_day!);
          
          const { data: parentData, error: parentError } = await supabase
            .from('accounts_receivable')
            .insert([{
              ...baseReceivableData,
              amount: amountPerInstallment,
              due_date: formatDateToString(firstDueDate),
              description: `${values.description} - 01 de ${String(installments).padStart(2, '0')}`,
              installment_number: 1,
              total_installments: installments,
            }])
            .select()
            .single();

          if (parentError) throw parentError;

          // Create remaining installments
          const charges = [];
          for (let i = 1; i < installments; i++) {
            const dueDate = new Date(values.due_date!);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setDate(values.due_day!);
            
            charges.push({
              ...baseReceivableData,
              amount: amountPerInstallment,
              due_date: formatDateToString(dueDate),
              description: `${values.description} - ${String(i + 1).padStart(2, '0')} de ${String(installments).padStart(2, '0')}`,
              installment_number: i + 1,
              total_installments: installments,
              parent_receivable_id: parentData.id,
            });
          }

          if (charges.length > 0) {
            const { error } = await supabase
              .from('accounts_receivable')
              .insert(charges);

            if (error) throw error;
          }

          toast({
            title: 'Sucesso',
            description: `${installments} cobranças parceladas cadastradas com sucesso`,
          });
        } else {
          // Cobrança recorrente (mensal, trimestral, semestral, anual)
          const monthsIncrement = values.occurrence_type === 'mensal' ? 1 :
                                  values.occurrence_type === 'trimestral' ? 3 :
                                  values.occurrence_type === 'semestral' ? 6 : 12;
          
          // Create first occurrence as parent
          const firstDueDate = new Date(values.due_date!);
          firstDueDate.setDate(values.due_day!);
          
          const { data: parentData, error: parentError } = await supabase
            .from('accounts_receivable')
            .insert([{
              ...baseReceivableData,
              amount: parseFloat(values.amount),
              due_date: formatDateToString(firstDueDate),
            }])
            .select()
            .single();

          if (parentError) throw parentError;

          // Create remaining occurrences
          const charges = [];
          for (let i = 1; i < 12; i++) {
            const dueDate = new Date(values.due_date!);
            dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement));
            dueDate.setDate(values.due_day!);
            
            charges.push({
              ...baseReceivableData,
              amount: parseFloat(values.amount),
              due_date: formatDateToString(dueDate),
              parent_receivable_id: parentData.id,
            });
          }

          const { error } = await supabase
            .from('accounts_receivable')
            .insert(charges);

          if (error) throw error;

          toast({
            title: 'Sucesso',
            description: `12 cobranças ${values.occurrence_type}s cadastradas com sucesso`,
          });
        }
      }

      form.reset();
      onOpenChange(false);
      
      // Call onSuccess with appropriate parameters
      if (account) {
        // Editing - check if we need to show bulk action modal
        const isRecurring = account.occurrence_type !== 'unica';
        const needsBulkAction = isRecurring && !account.bulkActionType;
        
        if (needsBulkAction) {
          // Pass the account data and flag to show bulk modal
          if (onSuccess) onSuccess(values, true);
        } else {
          // Already processed bulk action or single occurrence
          if (onSuccess) onSuccess();
        }
      } else {
        // Creating new - just refresh
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar' : 'Nova'} Conta a Receber</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Pagamento de serviço" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Emissão</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occurrence_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocorrência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unica">Única</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                        <SelectItem value="parcelada">Parcelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {occurrenceType === 'unica' && (
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {occurrenceType && occurrenceType !== 'unica' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data do 1º Vencimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="due_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do Vencimento</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="31" 
                          placeholder="Ex: 10"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {occurrenceType === 'parcelada' && (
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="Ex: 12"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => {
                  // Formata o valor inicial quando há um account sendo editado
                  const initialValue = account && field.value ? 
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(parseFloat(field.value)) : '';
                  
                  return (
                    <FormItem>
                      <FormLabel>Valor {occurrenceType === 'parcelada' && '(Total)'}</FormLabel>
                      <FormControl>
                        <Input 
                          defaultValue={initialValue}
                          placeholder="R$ 0,00"
                          onChange={(e) => {
                            let value = e.target.value;
                            // Remove tudo exceto dígitos
                            value = value.replace(/\D/g, '');
                            // Converte para número e divide por 100 para ter os centavos
                            const numValue = parseInt(value || '0') / 100;
                            // Formata como moeda BRL
                            const formatted = new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(numValue);
                            e.target.value = formatted;
                            // Armazena o valor numérico no formato string para o form
                            field.onChange(numValue.toFixed(2));
                          }}
                          onBlur={(e) => {
                            // Garante formatação ao perder foco
                            const numValue = parseFloat(field.value || '0');
                            const formatted = new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(numValue);
                            e.target.value = formatted;
                          }}
                          onFocus={(e) => {
                            // Mantém formatação ao focar
                            const numValue = parseFloat(field.value || '0');
                            const formatted = new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(numValue);
                            e.target.value = formatted;
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPaymentMethod(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods?.map((method) => (
                        <SelectItem key={method.id} value={method.name}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPaymentMethod?.toLowerCase().includes('cartão') && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="credit_card_installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcelamento do Cartão</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const installments = parseInt(value);
                          field.onChange(installments);
                          setCreditCardInstallments(installments);
                        }} 
                        value={field.value?.toString() || '1'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}x {num === 1 ? '(à vista)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(() => {
                  const amount = parseCurrency(form.watch('amount'));
                  const installments = form.watch('credit_card_installments') || 1;
                  
                  if (amount > 0) {
                    const fees = calculateCreditCardFees(amount, installments);
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="font-semibold text-base mb-2">Cálculo de Taxas:</div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor original:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxa fixa (2,99% + R$ 0,49):</span>
                          <span className="text-orange-600 font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fees.fixedFee)}
                          </span>
                        </div>
                        {installments > 1 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxa antecipação (1,6% ao mês × {installments - 1}):</span>
                            <span className="text-orange-600 font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fees.anticipationFee)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground font-semibold">Total de taxas:</span>
                          <span className="text-red-600 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fees.totalFees)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Valor total a receber:</span>
                          <span className="text-green-600 font-bold text-lg">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fees.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between bg-primary/10 p-2 rounded">
                          <span className="font-semibold">Valor de cada parcela:</span>
                          <span className="font-bold">
                            {installments}× de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fees.installmentValue)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Nota Fiscal</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!account && asaasSettings && (asaasSettings as any).is_active && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <FormLabel>Criar automaticamente no Asaas</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    A cobrança será criada automaticamente no Asaas após salvar
                  </p>
                </div>
                <Switch
                  checked={syncWithAsaas}
                  onCheckedChange={setSyncWithAsaas}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}