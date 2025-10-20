import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Building2, User } from 'lucide-react';
import { maskPhone, maskCpfCnpj, maskCEP, maskDate } from '@/lib/masks';

export default function ClientRegistration() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    client_type: 'company' as 'person' | 'company',
    company_name: '',
    nickname: '',
    full_name: '',
    cpf_cnpj: '',
    responsible_cpf: '',
    birth_date: '',
    email: '',
    phone: '',
    address_cep: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
  });

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    if (field === 'phone') {
      processedValue = maskPhone(value);
    } else if (field === 'cpf_cnpj') {
      processedValue = maskCpfCnpj(value);
    } else if (field === 'responsible_cpf') {
      processedValue = maskCpfCnpj(value);
    } else if (field === 'address_cep') {
      processedValue = maskCEP(value);
      if (processedValue.replace(/\D/g, '').length === 8) {
        fetchAddressByCep(processedValue.replace(/\D/g, ''));
      }
    } else if (field === 'birth_date') {
      processedValue = maskDate(value);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address_street: data.logradouro || '',
          address_neighborhood: data.bairro || '',
          address_city: data.localidade || '',
          address_state: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-client', {
        body: formData,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: 'Cadastro realizado!',
        description: 'Seus dados foram enviados com sucesso. Em breve entraremos em contato.',
      });
    } catch (error: any) {
      console.error('Error registering client:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Não foi possível completar o cadastro. Tente novamente.',
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
            <CardTitle className="text-2xl">Cadastro Realizado!</CardTitle>
            <CardDescription className="text-base">
              Seus dados foram enviados com sucesso. Em breve nossa equipe entrará em contato.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Cadastro de Cliente</CardTitle>
          <CardDescription className="text-base mt-2">
            Preencha seus dados para iniciar o atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="client_type">Tipo de Cliente *</Label>
              <Select
                value={formData.client_type}
                onValueChange={(value: 'person' | 'company') => handleInputChange('client_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Pessoa Física
                    </div>
                  </SelectItem>
                  <SelectItem value="company">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Pessoa Jurídica
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.client_type === 'company' ? (
              <>
                <div>
                  <Label htmlFor="nickname">Nome da Empresa *</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="Como a empresa é conhecida"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpf_cnpj">CNPJ *</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Razão Social *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="full_name">Responsável *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="responsible_cpf">CPF do Responsável *</Label>
                  <Input
                    id="responsible_cpf"
                    value={formData.responsible_cpf}
                    onChange={(e) => handleInputChange('responsible_cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="birth_date">Data de Nascimento do Responsável</Label>
                  <Input
                    id="birth_date"
                    value={formData.birth_date}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpf_cnpj">CPF *</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    value={formData.birth_date}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Endereço</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address_cep">CEP</Label>
                  <Input
                    id="address_cep"
                    value={formData.address_cep}
                    onChange={(e) => handleInputChange('address_cep', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address_street">Rua</Label>
                    <Input
                      id="address_street"
                      value={formData.address_street}
                      onChange={(e) => handleInputChange('address_street', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_number">Número</Label>
                    <Input
                      id="address_number"
                      value={formData.address_number}
                      onChange={(e) => handleInputChange('address_number', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => handleInputChange('address_complement', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="address_neighborhood">Bairro</Label>
                    <Input
                      id="address_neighborhood"
                      value={formData.address_neighborhood}
                      onChange={(e) => handleInputChange('address_neighborhood', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_city">Cidade</Label>
                    <Input
                      id="address_city"
                      value={formData.address_city}
                      onChange={(e) => handleInputChange('address_city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_state">Estado</Label>
                    <Input
                      id="address_state"
                      value={formData.address_state}
                      onChange={(e) => handleInputChange('address_state', e.target.value)}
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}