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
import { useToast } from '@/hooks/use-toast';
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
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.occurrence_type === 'unica') {
    return data.due_date !== undefined;
  }
  if (['mensal', 'trimestral', 'semestral', 'anual'].includes(data.occurrence_type)) {
    return data.due_day !== undefined;
  }
  if (data.occurrence_type === 'parcelada') {
    return data.due_day !== undefined && data.installments !== undefined;
  }
  return true;
}, {
  message: "Preencha todos os campos obrigatórios para o tipo de ocorrência selecionado",
});

interface ReceivableFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: any;
  onSuccess?: () => void;
}

export function ReceivableFormModal({ open, onOpenChange, account, onSuccess }: ReceivableFormModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: '',
      description: '',
      category: '',
      amount: '',
      occurrence_type: 'unica',
      payment_method: '',
      invoice_number: '',
      notes: '',
    },
  });

  const occurrenceType = form.watch('occurrence_type');

  useEffect(() => {
    if (open) {
      fetchClients();
      if (account) {
        form.reset({
          client_id: account.client_id,
          description: account.description,
          category: account.category,
          amount: account.amount.toString(),
          issue_date: account.issue_date ? new Date(account.issue_date) : new Date(),
          due_date: account.due_date ? new Date(account.due_date) : undefined,
          occurrence_type: (account.occurrence_type as any) || 'unica',
          due_day: account.due_day || undefined,
          installments: account.installments || undefined,
          payment_method: account.payment_method || '',
          invoice_number: account.invoice_number || '',
          notes: account.notes || '',
        });
        setClientSearch(account.client?.full_name || account.client?.company_name || '');
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
      .select('id, full_name, company_name')
      .eq('is_active', true)
      .order('full_name');
    
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
        issue_date: values.issue_date.toISOString().split('T')[0],
      };

      if (account) {
        // Edição - não gera cobranças múltiplas
        const { error } = await supabase
          .from('accounts_receivable')
          .update({
            ...baseReceivableData,
            amount: parseFloat(values.amount),
            due_date: values.due_date ? values.due_date.toISOString().split('T')[0] : values.issue_date.toISOString().split('T')[0],
          })
          .eq('id', account.id);

        if (error) throw error;

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
              due_date: values.due_date!.toISOString().split('T')[0],
            }]);

          if (error) throw error;

          toast({
            title: 'Sucesso',
            description: 'Conta a receber cadastrada com sucesso',
          });
        } else if (values.occurrence_type === 'parcelada') {
          // Cobrança parcelada
          const totalAmount = parseFloat(values.amount);
          const installments = values.installments!;
          const amountPerInstallment = totalAmount / installments;
          
          const charges = [];
          for (let i = 0; i < installments; i++) {
            const dueDate = new Date(values.issue_date);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setDate(values.due_day!);
            
            charges.push({
              ...baseReceivableData,
              amount: amountPerInstallment,
              due_date: dueDate.toISOString().split('T')[0],
              description: `${values.description} - ${String(i + 1).padStart(2, '0')} de ${String(installments).padStart(2, '0')}`,
              installment_number: i + 1,
              total_installments: installments,
            });
          }

          const { error } = await supabase
            .from('accounts_receivable')
            .insert(charges);

          if (error) throw error;

          toast({
            title: 'Sucesso',
            description: `${installments} cobranças parceladas cadastradas com sucesso`,
          });
        } else {
          // Cobrança recorrente (mensal, trimestral, semestral, anual)
          const charges = [];
          const monthsIncrement = values.occurrence_type === 'mensal' ? 1 :
                                  values.occurrence_type === 'trimestral' ? 3 :
                                  values.occurrence_type === 'semestral' ? 6 : 12;
          
          for (let i = 0; i < 12; i++) {
            const dueDate = new Date(values.issue_date);
            dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement));
            dueDate.setDate(values.due_day!);
            
            charges.push({
              ...baseReceivableData,
              amount: parseFloat(values.amount),
              due_date: dueDate.toISOString().split('T')[0],
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
      if (onSuccess) onSuccess();
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
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Digite para buscar cliente..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                      />
                      {showClientDropdown && clientSearch && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                          {clients
                            .filter(client => {
                              const name = (client.full_name || client.company_name || '').toLowerCase();
                              return name.includes(clientSearch.toLowerCase());
                            })
                            .map((client) => (
                              <div
                                key={client.id}
                                className="px-3 py-2 cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  field.onChange(client.id);
                                  setClientSearch(client.full_name || client.company_name || '');
                                  setShowClientDropdown(false);
                                }}
                              >
                                {client.full_name || client.company_name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
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
              </div>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor {occurrenceType === 'parcelada' && '(Total)'} (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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