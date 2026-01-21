import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  Save,
  X,
  Copy,
  Eye,
  Globe,
  Palette,
  Wrench,
  TrendingUp,
  GripVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CONTRACT_TEMPLATES, ContractTemplate, ContractField, ContractStyleConfig, DEFAULT_STYLE_CONFIG } from '@/types/contract-generator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

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
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const TEXT_ALIGNMENTS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'justify', label: 'Justificado' },
];

const serviceIcons: Record<string, React.ElementType> = {
  'Desenvolvimento Web': Globe,
  'Marketing Digital': TrendingUp,
  'Manutenção': Wrench,
  'Design': Palette,
};

const STORAGE_KEY = 'contract-templates-custom';

export default function ContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  
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
  const [editingDefaultTemplate, setEditingDefaultTemplate] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    // Load custom templates from localStorage
    const customTemplatesJson = localStorage.getItem(STORAGE_KEY);
    const customTemplates: ContractTemplate[] = customTemplatesJson 
      ? JSON.parse(customTemplatesJson) 
      : [];
    
    // Combine with default templates
    const allTemplates = [...CONTRACT_TEMPLATES, ...customTemplates];
    setTemplates(allTemplates);
  };

  const saveCustomTemplates = (customTemplates: ContractTemplate[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
  };

  const getCustomTemplates = (): ContractTemplate[] => {
    const customTemplatesJson = localStorage.getItem(STORAGE_KEY);
    return customTemplatesJson ? JSON.parse(customTemplatesJson) : [];
  };

  const isDefaultTemplate = (templateId: string): boolean => {
    return CONTRACT_TEMPLATES.some(t => t.id === templateId);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditingDefaultTemplate(false);
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
    setIsFormOpen(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    const isDefault = isDefaultTemplate(template.id);
    setEditingDefaultTemplate(isDefault);
    setSelectedTemplate(template);
    setFormData({
      id: isDefault ? '' : template.id,
      name: isDefault ? `${template.name} (Personalizado)` : template.name,
      serviceType: template.serviceType,
      description: template.description,
      content: template.content,
    });
    setFields([...template.fields]);
    setStyleConfig(template.styleConfig || { ...DEFAULT_STYLE_CONFIG });
    setIsFormOpen(true);
    if (isDefault) {
      toast.info('Editando template padrão - será salvo como nova versão personalizada.');
    }
  };

  const handleDuplicate = (template: ContractTemplate) => {
    setSelectedTemplate(null);
    setEditingDefaultTemplate(false);
    setFormData({
      id: '',
      name: `${template.name} (Cópia)`,
      serviceType: template.serviceType,
      description: template.description,
      content: template.content,
    });
    setFields([...template.fields]);
    setStyleConfig(template.styleConfig || { ...DEFAULT_STYLE_CONFIG });
    setIsFormOpen(true);
    toast.info('Template duplicado. Faça as alterações desejadas e salve.');
  };

  const handleDelete = (template: ContractTemplate) => {
    if (isDefaultTemplate(template.id)) {
      toast.error('Templates padrão não podem ser excluídos.');
      return;
    }
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedTemplate) return;
    
    const customTemplates = getCustomTemplates().filter(t => t.id !== selectedTemplate.id);
    saveCustomTemplates(customTemplates);
    loadTemplates();
    setIsDeleteOpen(false);
    setSelectedTemplate(null);
    toast.success('Template excluído com sucesso');
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

    const templateId = formData.id || `custom-${Date.now()}`;
    const newTemplate: ContractTemplate = {
      id: templateId,
      name: formData.name,
      serviceType: formData.serviceType,
      description: formData.description,
      content: formData.content,
      fields: fields,
      styleConfig: styleConfig,
    };

    const customTemplates = getCustomTemplates();
    
    if (selectedTemplate && !editingDefaultTemplate) {
      // Update existing custom template
      const index = customTemplates.findIndex(t => t.id === selectedTemplate.id);
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
    loadTemplates();
    setIsFormOpen(false);
    toast.success(selectedTemplate ? 'Template atualizado com sucesso' : 'Template criado com sucesso');
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

  return (
    <DashboardLayout breadcrumbLabel="Templates de Contratos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Templates de Contratos</h1>
            <p className="text-muted-foreground">
              Crie e gerencie modelos de contratos para diferentes tipos de serviço
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = serviceIcons[template.serviceType] || FileText;
            const isDefault = isDefaultTemplate(template.id);
            
            return (
              <Card key={template.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {template.serviceType}
                          </Badge>
                          {isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{template.fields.length} campos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Editar Template' : 'Novo Template de Contrato'}
              </DialogTitle>
              <DialogDescription>
                Configure o modelo de contrato com campos dinâmicos
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
                {/* Left Column - Basic Info & Fields */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Informações Básicas</h3>
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
                  </div>

                  <Separator />

                  {/* Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Campos Dinâmicos</h3>
                      <Button variant="outline" size="sm" onClick={addField}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[300px] pr-4">
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
                    </ScrollArea>
                  </div>
                </div>

                {/* Right Column - Content & Style */}
                <div className="space-y-4">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="content">Conteúdo</TabsTrigger>
                      <TabsTrigger value="style">Formatação</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="content" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Conteúdo do Contrato *</h3>
                        <p className="text-xs text-muted-foreground">
                          Use {`{{nome_do_campo}}`} para campos dinâmicos
                        </p>
                      </div>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Digite o conteúdo do contrato..."
                        className="min-h-[450px] font-mono text-sm"
                      />
                    </TabsContent>
                    
                    <TabsContent value="style" className="space-y-6 mt-4">
                      <h3 className="font-medium">Configurações de Formatação</h3>
                      
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

                      {/* Background Image */}
                      <div className="space-y-4">
                        <Label>Imagem de Fundo (URL)</Label>
                        <Input
                          value={styleConfig.backgroundImage || ''}
                          onChange={(e) => setStyleConfig({ ...styleConfig, backgroundImage: e.target.value })}
                          placeholder="https://exemplo.com/imagem.png"
                        />
                        {styleConfig.backgroundImage && (
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
                        )}
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
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
              <DialogDescription>
                Pré-visualização do template de contrato
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] rounded-lg border p-6 bg-white dark:bg-slate-950">
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                {previewTemplate?.content}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Template</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o template "{selectedTemplate?.name}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
