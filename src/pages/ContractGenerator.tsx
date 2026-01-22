import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ContractPagedPreview } from '@/components/contracts/ContractPagedPreview';
import '@/styles/quill-custom.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Download, 
  Eye, 
  ChevronRight, 
  ChevronLeft,
  Printer,
  Copy,
  Check,
  Search,
  Globe,
  Palette,
  Wrench,
  TrendingUp,
  Share2
} from 'lucide-react';
import { CONTRACT_TEMPLATES, ContractTemplate, ContractField, ContractStyleConfig, DEFAULT_STYLE_CONFIG } from '@/types/contract-generator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const serviceIcons: Record<string, React.ElementType> = {
  'Desenvolvimento Web': Globe,
  'Marketing Digital': TrendingUp,
  'Manutenção': Wrench,
  'Design': Palette,
};

const STORAGE_KEY = 'contract-templates-custom';

export default function ContractGenerator() {
  const [step, setStep] = useState<'select' | 'fill' | 'preview'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const customTemplatesJson = localStorage.getItem(STORAGE_KEY);
    const customTemplates: ContractTemplate[] = customTemplatesJson 
      ? JSON.parse(customTemplatesJson) 
      : [];
    const allTemplates = [...CONTRACT_TEMPLATES, ...customTemplates];
    console.log('Templates loaded:', allTemplates.length);
    setTemplates(allTemplates);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, company_name, responsible_name, cpf_cnpj, address_street, address_number, address_neighborhood, address_city, address_state, client_type')
      .order('full_name');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
    }
    
    if (data) {
      setClients(data);
    }
  };

  const handleTemplateSelect = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Initialize form data with default values
    const initialData: Record<string, string> = {};
    template.fields.forEach(field => {
      if (field.defaultValue) {
        initialData[field.name] = field.defaultValue;
      }
    });
    setFormData(initialData);
    setStep('fill');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client && selectedTemplate) {
      const clientName = client.client_type === 'pj' 
        ? (client.company_name || client.responsible_name || client.full_name || '')
        : (client.full_name || client.company_name || '');
      
      const addressParts = [
        client.address_street,
        client.address_number,
        client.address_neighborhood,
        client.address_city,
        client.address_state
      ].filter(Boolean);
      const address = addressParts.join(', ');
      
      setFormData(prev => ({
        ...prev,
        client_name: clientName,
        client_document: client.cpf_cnpj || '',
        client_address: address || '',
      }));
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const number = parseInt(numericValue, 10) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (fieldName: string, value: string) => {
    const formatted = formatCurrency(value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: formatted,
    }));
  };

  const generateContract = () => {
    if (!selectedTemplate) return;

    let content = selectedTemplate.content;
    
    // Replace all placeholders with actual values
    Object.entries(formData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value || `[${key}]`);
    });

    // Replace date placeholder
    const today = new Date();
    content = content.replace('[Data]', today.toLocaleDateString('pt-BR'));
    content = content.replace('[Local]', 'São Paulo');

    setGeneratedContent(content);
    setStep('preview');
  };

  const validateForm = (): boolean => {
    if (!selectedTemplate) return false;
    
    for (const field of selectedTemplate.fields) {
      if (field.required && !formData[field.name]) {
        toast.error(`O campo "${field.label}" é obrigatório`);
        return false;
      }
    }
    return true;
  };

  const handleGenerate = () => {
    if (validateForm()) {
      generateContract();
    }
  };

  const handlePrint = () => {
    const style = selectedTemplate?.styleConfig || DEFAULT_STYLE_CONFIG;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const backgroundStyle = style.backgroundImage 
        ? `background-image: url('${style.backgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
        : '';
      const overlayStyle = style.backgroundImage
        ? `position: relative;`
        : '';
      const contentOverlay = style.backgroundImage
        ? `<div style="position: absolute; inset: 0; background: rgba(255,255,255,${1 - style.backgroundOpacity}); z-index: 0;"></div>`
        : '';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Contrato - ${selectedTemplate?.name}</title>
            <style>
              @page {
                margin: ${style.marginTop}px ${style.marginRight}px ${style.marginBottom}px ${style.marginLeft}px;
              }
              body { 
                font-family: '${style.fontFamily}', serif; 
                font-size: ${style.fontSize}pt;
                line-height: ${style.lineHeight};
                text-align: ${style.textAlign};
                margin: 0;
                padding: ${style.marginTop}px ${style.marginRight}px ${style.marginBottom}px ${style.marginLeft}px;
                ${backgroundStyle}
                ${overlayStyle}
                ${style.paragraphBold ? 'font-weight: bold;' : ''}
              }
              .content {
                position: relative;
                z-index: 1;
              }
              .contract-content { 
                font-family: '${style.fontFamily}', serif;
                font-size: ${style.fontSize}pt;
                line-height: ${style.lineHeight};
                ${style.paragraphBold ? 'font-weight: bold;' : ''}
              }
              .contract-content p {
                margin: 0;
                margin-bottom: ${style.paragraphSpacing}em;
              }
              .contract-content p:last-child {
                margin-bottom: 0;
              }
              .contract-content h1,
              .contract-content h2,
              .contract-content h3 {
                font-weight: bold;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              .contract-content ul,
              .contract-content ol {
                margin-left: 2em;
                margin-bottom: 1em;
              }
              .contract-content strong {
                font-weight: bold;
              }
              .contract-content em {
                font-style: italic;
              }
              .contract-content u {
                text-decoration: underline;
              }
              .contract-content .ql-align-center,
              .contract-content p.ql-align-center {
                text-align: center !important;
              }
              .contract-content .ql-align-right,
              .contract-content p.ql-align-right {
                text-align: right !important;
              }
              .contract-content .ql-align-left,
              .contract-content p.ql-align-left {
                text-align: left !important;
              }
              .contract-content .ql-align-justify,
              .contract-content p.ql-align-justify {
                text-align: justify !important;
              }
              .header-logo {
                margin-bottom: 20px;
              }
              .header-logo img {
                height: ${style.headerLogoHeight}px;
              }
              .header-line {
                width: 100%;
                border-top: 2px solid #FFD700;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            ${contentOverlay}
            <div class="content">
              ${style.headerLogo ? `
                <div class="header-logo">
                  <img src="${style.headerLogo}" alt="Logo" />
                  ${style.showHeaderLine ? '<div class="header-line"></div>' : ''}
                </div>
              ` : ''}
              <div class="contract-content">${generatedContent}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      toast.success('Contrato copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar contrato');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrato-${selectedTemplate?.id}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Contrato baixado com sucesso');
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderField = (field: ContractField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={(v) => handleFieldChange(field.name, v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleCurrencyChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="pl-10"
            />
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerador de Contratos</h1>
            <p className="text-muted-foreground">
              Crie contratos profissionais a partir de templates pré-definidos
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center gap-2">
            <Badge variant={step === 'select' ? 'default' : 'outline'} className="gap-1">
              1. Template
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step === 'fill' ? 'default' : 'outline'} className="gap-1">
              2. Preencher
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step === 'preview' ? 'default' : 'outline'} className="gap-1">
              3. Visualizar
            </Badge>
          </div>
        </div>

        {/* Step 1: Select Template */}
        {step === 'select' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const Icon = serviceIcons[template.serviceType] || FileText;
                return (
                  <Card 
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                      selectedTemplate?.id === template.id && "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {template.serviceType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>{template.fields.length} campos</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Fill Form */}
        {step === 'fill' && selectedTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>Preencha os campos para gerar o contrato</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep('select')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label>Selecionar Cliente (opcional)</Label>
                  <Select value={selectedClientId} onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente para preencher automaticamente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients
                        .map(client => ({
                          ...client,
                          displayName: client.client_type === 'pj' 
                            ? (client.company_name || client.responsible_name || client.full_name || 'Empresa sem nome')
                            : (client.full_name || client.company_name || 'Cliente sem nome')
                        }))
                        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))
                        .map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.displayName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Dynamic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.fields.map((field) => (
                    <div 
                      key={field.id} 
                      className={cn(
                        "space-y-2",
                        field.type === 'textarea' && "md:col-span-2"
                      )}
                    >
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleGenerate} size="lg">
                    <Eye className="h-4 w-4 mr-2" />
                    Gerar Contrato
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sobre este template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Serviço</Label>
                  <p className="font-medium">{selectedTemplate.serviceType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Campos do contrato</Label>
                  <div className="mt-2 space-y-1">
                    {selectedTemplate.fields.map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          formData[field.name] ? "bg-green-500" : "bg-muted"
                        )} />
                        <span className={formData[field.name] ? "text-foreground" : "text-muted-foreground"}>
                          {field.label}
                        </span>
                        {field.required && <span className="text-xs text-destructive">*</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Actions */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Button variant="outline" onClick={() => setStep('fill')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar e Editar
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar TXT
                    </Button>
                    <Button onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir / PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pré-visualização do Contrato
                </CardTitle>
                <CardDescription>
                  {selectedTemplate?.name} - Gerado em {new Date().toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const style = selectedTemplate?.styleConfig || DEFAULT_STYLE_CONFIG;
                  
                  return (
                    <ScrollArea className="h-[600px] bg-gray-100 p-6">
                      <div ref={previewRef}>
                        <ContractPagedPreview 
                          content={generatedContent}
                          styleConfig={style}
                        />
                      </div>
                    </ScrollArea>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
