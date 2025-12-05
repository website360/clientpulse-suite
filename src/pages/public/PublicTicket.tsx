import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Ticket, Loader2, Paperclip, X } from 'lucide-react';
import { maskPhone } from '@/lib/masks';

interface Department {
  id: string;
  name: string;
  color: string;
}

export default function PublicTicket() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    if (field === 'phone') {
      processedValue = maskPhone(value);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 1 * 1024 * 1024; // 1MB
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name} excede o limite de 1MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Departamento é obrigatório';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Assunto é obrigatório';
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = 'Assunto deve ter pelo menos 5 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);

    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
          };
        })
      );

      const { data, error } = await supabase.functions.invoke('create-public-ticket', {
        body: {
          ...formData,
          attachments: attachmentData,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setTicketNumber(data.ticket_number);
      setSuccess(true);
      
      toast({
        title: 'Chamado aberto com sucesso!',
        description: `Ticket #${data.ticket_number} criado. ${data.client_found ? 'Seu cadastro foi identificado.' : ''}`,
      });
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro ao abrir chamado',
        description: error.message || 'Não foi possível criar o ticket. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Chamado Aberto!</CardTitle>
            <CardDescription className="text-base">
              Seu chamado foi registrado com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Número do Ticket</p>
              <p className="text-3xl font-bold text-primary">#{ticketNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Guarde este número para acompanhar o andamento do seu chamado. 
              Nossa equipe entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Abrir Chamado</CardTitle>
          <CardDescription className="text-base mt-2">
            Preencha os dados abaixo para abrir um ticket de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Seus Dados</h3>
              
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite seu nome completo"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Dados do Chamado */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Detalhes do Chamado</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department_id">Departamento *</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => handleInputChange('department_id', value)}
                    disabled={loadingDepts}
                  >
                    <SelectTrigger className={errors.department_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loadingDepts ? "Carregando..." : "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: dept.color }}
                            />
                            {dept.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department_id && <p className="text-sm text-destructive mt-1">{errors.department_id}</p>}
                </div>
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
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

              <div>
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Resumo do problema"
                  className={errors.subject ? 'border-destructive' : ''}
                />
                {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject}</p>}
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva detalhadamente o problema ou solicitação"
                  rows={5}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
              </div>

              {/* Anexos */}
              <div>
                <Label>Anexos (opcional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= 5}
                    className="w-full"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Adicionar Anexo ({attachments.length}/5)
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos aceitos: imagens, PDF, documentos do Office. Máx. 1MB por arquivo.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Chamado'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
