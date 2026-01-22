import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ContractPagedPreview } from '@/components/contracts/ContractPagedPreview';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Save,
  X,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';
import { CONTRACT_TEMPLATES, ContractTemplate, ContractField, ContractStyleConfig, DEFAULT_STYLE_CONFIG } from '@/types/contract-generator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SERVICE_TYPES = [
  'Desenvolvimento Web',
  'Marketing Digital',
  'Manutenção',
  'Design',
  'Consultoria',
  'E-commerce',
  'Aplicativo Mobile',
  'Outro',
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'select', label: 'Seleção' },
];

const FONT_FAMILIES = [
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const TEXT_ALIGNMENTS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'justify', label: 'Justificado' },
];

const STORAGE_KEY = 'contract-templates-custom';

export default function ContractTemplateEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const [editingDefaultTemplate, setEditingDefaultTemplate] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    serviceType: '',
    description: '',
    content: '',
  });
  const [fields, setFields] = useState<ContractField[]>([]);
  const [styleConfig, setStyleConfig] = useState<ContractStyleConfig>(DEFAULT_STYLE_CONFIG);
  const [expandedFieldIndex, setExpandedFieldIndex] = useState<number | null>(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      // New template
      setFormData({
        id: '',
        name: '',
        serviceType: '',
        description: '',
        content: getDefaultContent(),
      });
      setFields([
        { id: 'client_name', name: 'client_name', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'Nome completo ou razão social' },
        { id: 'client_document', name: 'client_document', label: 'CPF/CNPJ', type: 'text', required: true, placeholder: '000.000.000-00' },
        { id: 'client_address', name: 'client_address', label: 'Endereço', type: 'textarea', required: true, placeholder: 'Endereço completo' },
      ]);
      setStyleConfig({ ...DEFAULT_STYLE_CONFIG });
    }
  }, [templateId]);

  const loadTemplate = (id: string) => {
    const customTemplates = getCustomTemplates();
    const allTemplates = [...CONTRACT_TEMPLATES, ...customTemplates];
    const template = allTemplates.find(t => t.id === id);
    
    if (template) {
      const isDefault = isDefaultTemplate(id);
      setEditingDefaultTemplate(isDefault);
      setFormData({
        id: isDefault ? '' : template.id,
        name: isDefault ? `${template.name} (Personalizado)` : template.name,
        serviceType: template.serviceType,
        description: template.description,
        content: template.content,
      });
      setFields([...template.fields]);
      setStyleConfig(template.styleConfig || { ...DEFAULT_STYLE_CONFIG });
      if (isDefault) {
        toast.info('Editando template padrão - será salvo como nova versão personalizada.');
      }
    }
  };

  const getCustomTemplates = (): ContractTemplate[] => {
    const customTemplatesJson = localStorage.getItem(STORAGE_KEY);
    return customTemplatesJson ? JSON.parse(customTemplatesJson) : [];
  };

  const saveCustomTemplates = (customTemplates: ContractTemplate[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
  };

  const isDefaultTemplate = (templateId: string): boolean => {
    return CONTRACT_TEMPLATES.some(t => t.id === templateId);
  };

  const handleSave = () => {
    if (!formData.name || !formData.serviceType || !formData.content) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (fields.length === 0) {
      toast.error('Adicione pelo menos um campo ao template');
      return;
    }

    const templateIdToSave = formData.id || `custom-${Date.now()}`;
    const newTemplate: ContractTemplate = {
      id: templateIdToSave,
      name: formData.name,
      serviceType: formData.serviceType,
      description: formData.description,
      content: formData.content,
      fields: fields,
      styleConfig: styleConfig,
    };

    const customTemplates = getCustomTemplates();
    
    if (templateId && !editingDefaultTemplate) {
      // Update existing custom template
      const index = customTemplates.findIndex(t => t.id === templateId);
      if (index >= 0) {
        customTemplates[index] = newTemplate;
      } else {
        customTemplates.push(newTemplate);
      }
    } else {
      // Create new (or save edited default as new)
      customTemplates.push(newTemplate);
    }

    saveCustomTemplates(customTemplates);
    toast.success(templateId ? 'Template atualizado com sucesso' : 'Template criado com sucesso');
    navigate('/contracts/templates');
  };

  const addField = () => {
    const newField: ContractField = {
      id: `field_${Date.now()}`,
      name: `campo_${fields.length + 1}`,
      label: 'Novo Campo',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setFields([...fields, newField]);
    setExpandedFieldIndex(fields.length);
  };

  const updateField = (index: number, updates: Partial<ContractField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    
    // Auto-update name based on label if it's a custom field
    if (updates.label && !newFields[index].id.startsWith('client_')) {
      newFields[index].name = updates.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }
    
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const field = fields[index];
    if (['client_name', 'client_document', 'client_address'].includes(field.id)) {
      toast.error('Campos de cliente são obrigatórios e não podem ser removidos');
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const getDefaultContent = () => {
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{client_name}}, inscrito no CPF/CNPJ sob o nº {{client_document}}, com endereço em {{client_address}}.

CONTRATADA: [NOME DA SUA EMPRESA], inscrita no CNPJ sob o nº [SEU CNPJ], com sede em [SEU ENDEREÇO].

As partes acima qualificadas celebram o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições a seguir:

CLÁUSULA 1ª - DO OBJETO
[Descreva o objeto do contrato aqui. Use {{nome_do_campo}} para inserir campos dinâmicos.]

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
[Descreva valores e forma de pagamento]

CLÁUSULA 3ª - DO PRAZO
[Defina prazos]

CLÁUSULA 4ª - DAS OBRIGAÇÕES
[Liste as obrigações]

CLÁUSULA 5ª - DA RESCISÃO
[Condições de rescisão]

CLÁUSULA 6ª - DO FORO
Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer dúvidas oriundas do presente contrato.

E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma.

[Local], [Data]

_______________________________
CONTRATANTE: {{client_name}}

_______________________________
CONTRATADA: [NOME DA SUA EMPRESA]`;
  };

  // Generate preview content
  const generatePreview = () => {
    let content = formData.content;
    fields.forEach(field => {
      const regex = new RegExp(`{{${field.name}}}`, 'g');
      content = content.replace(regex, `<strong>[${field.label}]</strong>`);
    });
    return content;
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contracts/templates')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {templateId ? 'Editar Template' : 'Novo Template'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure o template e visualize em tempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/contracts/templates')}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Left Column - Configuration */}
          <div className="border-r overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Template *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Contrato de Desenvolvimento"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Serviço *</Label>
                      <Select 
                        value={formData.serviceType} 
                        onValueChange={(v) => setFormData({ ...formData, serviceType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Breve descrição do template"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Content, Fields, and Style */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Conteúdo</TabsTrigger>
                  <TabsTrigger value="fields">Campos</TabsTrigger>
                  <TabsTrigger value="style">Formatação</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conteúdo do Contrato *</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Use {`{{nome_do_campo}}`} para campos dinâmicos. Formate o texto como no Word.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <ReactQuill
                          theme="snow"
                          value={formData.content}
                          onChange={(value) => setFormData({ ...formData, content: value })}
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline'],
                              [{ 'align': [] }],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              ['clean']
                            ]
                          }}
                          style={{ minHeight: '400px' }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Campos Dinâmicos</CardTitle>
                        <Button variant="outline" size="sm" onClick={addField}>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <Card 
                            key={field.id}
                            className={cn(
                              "transition-all",
                              expandedFieldIndex === index && "ring-2 ring-primary/20"
                            )}
                          >
                            <CardHeader 
                              className="py-2 px-3 cursor-pointer"
                              onClick={() => setExpandedFieldIndex(expandedFieldIndex === index ? null : index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{field.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {`{{${field.name}}}`}
                                  </Badge>
                                  {field.required && (
                                    <span className="text-destructive text-xs">*</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                                    disabled={index === 0}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                                    disabled={index === fields.length - 1}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); removeField(index); }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {expandedFieldIndex === index && (
                              <CardContent className="pt-0 pb-3 px-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Rótulo</Label>
                                    <Input
                                      value={field.label}
                                      onChange={(e) => updateField(index, { label: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Tipo</Label>
                                    <Select 
                                      value={field.type} 
                                      onValueChange={(v) => updateField(index, { type: v as any })}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FIELD_TYPES.map(type => (
                                          <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Placeholder</Label>
                                    <Input
                                      value={field.placeholder || ''}
                                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1 flex items-end">
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(index, { required: e.target.checked })}
                                        className="rounded"
                                      />
                                      Obrigatório
                                    </label>
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="space-y-6 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Configurações de Formatação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Font Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fonte</Label>
                          <Select 
                            value={styleConfig.fontFamily} 
                            onValueChange={(v) => setStyleConfig({ ...styleConfig, fontFamily: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONT_FAMILIES.map(font => (
                                <SelectItem key={font.value} value={font.value}>
                                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Alinhamento</Label>
                          <Select 
                            value={styleConfig.textAlign} 
                            onValueChange={(v) => setStyleConfig({ ...styleConfig, textAlign: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEXT_ALIGNMENTS.map(align => (
                                <SelectItem key={align.value} value={align.value}>
                                  {align.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Size Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tamanho do Texto: {styleConfig.fontSize}pt</Label>
                          <Slider
                            value={[styleConfig.fontSize]}
                            onValueChange={([v]) => setStyleConfig({ ...styleConfig, fontSize: v })}
                            min={8}
                            max={18}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tamanho do Título: {styleConfig.titleFontSize}pt</Label>
                          <Slider
                            value={[styleConfig.titleFontSize]}
                            onValueChange={([v]) => setStyleConfig({ ...styleConfig, titleFontSize: v })}
                            min={10}
                            max={24}
                            step={1}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Espaçamento entre Linhas: {styleConfig.lineHeight}</Label>
                        <Slider
                          value={[styleConfig.lineHeight * 10]}
                          onValueChange={([v]) => setStyleConfig({ ...styleConfig, lineHeight: v / 10 })}
                          min={10}
                          max={30}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Espaçamento entre Parágrafos (Enter): {styleConfig.paragraphSpacing}em</Label>
                        <Slider
                          value={[styleConfig.paragraphSpacing * 10]}
                          onValueChange={([v]) => setStyleConfig({ ...styleConfig, paragraphSpacing: v / 10 })}
                          min={0}
                          max={30}
                          step={1}
                        />
                      </div>

                      {/* Bold Settings */}
                      <div className="space-y-3">
                        <Label>Formatação de Texto</Label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={styleConfig.titleBold}
                              onChange={(e) => setStyleConfig({ ...styleConfig, titleBold: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Título em Negrito</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={styleConfig.paragraphBold}
                              onChange={(e) => setStyleConfig({ ...styleConfig, paragraphBold: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Texto em Negrito</span>
                          </label>
                        </div>
                      </div>

                      <Separator />

                      {/* Header Logo */}
                      <div className="space-y-4">
                        <Label>Logo do Cabeçalho</Label>
                        <div className="space-y-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('Imagem muito grande. Máximo 2MB.');
                                  return;
                                }
                                
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setStyleConfig({ ...styleConfig, headerLogo: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="cursor-pointer"
                          />
                          {styleConfig.headerLogo && (
                            <div className="space-y-3">
                              <div className="relative w-full h-24 rounded-lg border overflow-hidden bg-white flex items-center justify-center p-4">
                                <img 
                                  src={styleConfig.headerLogo} 
                                  alt="Logo Preview" 
                                  style={{ height: `${styleConfig.headerLogoHeight}px` }}
                                  className="object-contain"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Altura do Logo: {styleConfig.headerLogoHeight}px</Label>
                                <Slider
                                  value={[styleConfig.headerLogoHeight]}
                                  onValueChange={([v]) => setStyleConfig({ ...styleConfig, headerLogoHeight: v })}
                                  min={30}
                                  max={120}
                                  step={5}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="showHeaderLine"
                                  checked={styleConfig.showHeaderLine}
                                  onChange={(e) => setStyleConfig({ ...styleConfig, showHeaderLine: e.target.checked })}
                                  className="rounded"
                                />
                                <Label htmlFor="showHeaderLine" className="text-sm cursor-pointer">
                                  Mostrar linha horizontal abaixo do logo
                                </Label>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStyleConfig({ ...styleConfig, headerLogo: undefined })}
                                className="w-full"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remover Logo
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Background Image */}
                      <div className="space-y-4">
                        <Label>Imagem de Fundo</Label>
                        <div className="space-y-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('Imagem muito grande. Máximo 2MB.');
                                  return;
                                }
                                
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setStyleConfig({ ...styleConfig, backgroundImage: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="cursor-pointer"
                          />
                          {styleConfig.backgroundImage && (
                            <div className="space-y-3">
                              <div className="relative w-full h-32 rounded-lg border overflow-hidden bg-muted">
                                <img 
                                  src={styleConfig.backgroundImage} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStyleConfig({ ...styleConfig, backgroundImage: undefined })}
                                className="w-full"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remover Imagem
                              </Button>
                              <div className="space-y-2">
                                <Label>Opacidade da Imagem: {Math.round(styleConfig.backgroundOpacity * 100)}%</Label>
                                <Slider
                                  value={[styleConfig.backgroundOpacity * 100]}
                                  onValueChange={([v]) => setStyleConfig({ ...styleConfig, backgroundOpacity: v / 100 })}
                                  min={5}
                                  max={50}
                                  step={5}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Margins */}
                      <div className="space-y-4">
                        <Label>Margens (px)</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Superior: {styleConfig.marginTop}px</Label>
                            <Slider
                              value={[styleConfig.marginTop]}
                              onValueChange={([v]) => setStyleConfig({ ...styleConfig, marginTop: v })}
                              min={10}
                              max={100}
                              step={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Inferior: {styleConfig.marginBottom}px</Label>
                            <Slider
                              value={[styleConfig.marginBottom]}
                              onValueChange={([v]) => setStyleConfig({ ...styleConfig, marginBottom: v })}
                              min={10}
                              max={100}
                              step={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Esquerda: {styleConfig.marginLeft}px</Label>
                            <Slider
                              value={[styleConfig.marginLeft]}
                              onValueChange={([v]) => setStyleConfig({ ...styleConfig, marginLeft: v })}
                              min={10}
                              max={100}
                              step={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Direita: {styleConfig.marginRight}px</Label>
                            <Slider
                              value={[styleConfig.marginRight]}
                              onValueChange={([v]) => setStyleConfig({ ...styleConfig, marginRight: v })}
                              min={10}
                              max={100}
                              step={5}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="bg-muted/30 overflow-y-auto">
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pré-visualização em Tempo Real</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Visualize como o contrato ficará com as configurações atuais
                  </p>
                </CardHeader>
                <CardContent className="bg-gray-100 p-6">
                  <ContractPagedPreview 
                    content={generatePreview()}
                    styleConfig={styleConfig}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
