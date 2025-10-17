import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetUploader } from "@/components/documents/AssetUploader";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  document_type: z.enum(["contract", "proposal"]),
  service_id: z.string().optional(),
  template_html: z.string().min(1, "Template HTML é obrigatório"),
  variables: z.string().optional(),
  is_active: z.boolean().default(true),
  page_count: z.number().min(1).default(1),
  page_layouts: z.string().optional(),
  header_image_url: z.string().optional(),
  footer_image_url: z.string().optional(),
  watermark_url: z.string().optional(),
  page_backgrounds: z.string().optional(),
  styles: z.string().optional(),
  paper_size: z.enum(["A4", "Letter", "Legal"]).default("A4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
});

type DocumentTemplate = {
  id: string;
  name: string;
  description: string | null;
  document_type: "contract" | "proposal";
  service_id: string | null;
  template_html: string;
  variables: any;
  is_active: boolean;
  page_count?: number;
  page_layouts?: any;
  header_image_url?: string | null;
  footer_image_url?: string | null;
  watermark_url?: string | null;
  page_backgrounds?: any;
  styles?: string | null;
  paper_size?: string;
  orientation?: string;
};

type DocumentTemplateFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate | null;
  onSuccess: () => void;
};

export function DocumentTemplateFormModal({
  open,
  onOpenChange,
  template,
  onSuccess,
}: DocumentTemplateFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("basic");
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      document_type: "contract",
      service_id: "",
      template_html: "",
      variables: "[]",
      is_active: true,
      page_count: 1,
      page_layouts: "[]",
      header_image_url: "",
      footer_image_url: "",
      watermark_url: "",
      page_backgrounds: "[]",
      styles: "",
      paper_size: "A4",
      orientation: "portrait",
    },
  });

  // Buscar serviços
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || "",
        document_type: template.document_type,
        service_id: template.service_id || "",
        template_html: template.template_html,
        variables: JSON.stringify(template.variables || [], null, 2),
        is_active: template.is_active,
        page_count: template.page_count || 1,
        page_layouts: JSON.stringify(template.page_layouts || [], null, 2),
        header_image_url: template.header_image_url || "",
        footer_image_url: template.footer_image_url || "",
        watermark_url: template.watermark_url || "",
        page_backgrounds: JSON.stringify(template.page_backgrounds || [], null, 2),
        styles: template.styles || "",
        paper_size: (template.paper_size || "A4") as "A4" | "Letter" | "Legal",
        orientation: (template.orientation || "portrait") as "portrait" | "landscape",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        document_type: "contract",
        service_id: "",
        template_html: "",
        variables: "[]",
        is_active: true,
        page_count: 1,
        page_layouts: "[]",
        header_image_url: "",
        footer_image_url: "",
        watermark_url: "",
        page_backgrounds: "[]",
        styles: "",
        paper_size: "A4",
        orientation: "portrait",
      });
    }
  }, [template, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let parsedVariables = [];
      let parsedPageLayouts = [];
      let parsedPageBackgrounds = [];
      
      try {
        parsedVariables = JSON.parse(values.variables || "[]");
      } catch (e) {
        throw new Error("Variáveis JSON inválido");
      }

      try {
        parsedPageLayouts = JSON.parse(values.page_layouts || "[]");
      } catch (e) {
        throw new Error("Page Layouts JSON inválido");
      }

      try {
        parsedPageBackgrounds = JSON.parse(values.page_backgrounds || "[]");
      } catch (e) {
        throw new Error("Page Backgrounds JSON inválido");
      }

      const templateData = {
        name: values.name,
        description: values.description || null,
        document_type: values.document_type,
        service_id: values.service_id || null,
        template_html: values.template_html,
        variables: parsedVariables,
        is_active: values.is_active,
        page_count: values.page_count,
        page_layouts: parsedPageLayouts,
        header_image_url: values.header_image_url || null,
        footer_image_url: values.footer_image_url || null,
        watermark_url: values.watermark_url || null,
        page_backgrounds: parsedPageBackgrounds,
        styles: values.styles || null,
        paper_size: values.paper_size,
        orientation: values.orientation,
        created_by: user.id,
      };

      if (template?.id) {
        const { error } = await supabase
          .from("document_templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("document_templates")
          .insert([templateData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast({
        title: template ? "Template atualizado" : "Template criado",
        description: "Template salvo com sucesso.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  const predefinedVariables = [
    { key: "cliente_nome", label: "Nome do Cliente", type: "text", category: "Cliente", placeholder: "Ex: João Silva" },
    { key: "cliente_empresa", label: "Empresa", type: "text", category: "Cliente", placeholder: "Ex: Empresa LTDA" },
    { key: "cliente_cpf_cnpj", label: "CPF/CNPJ", type: "text", category: "Cliente", placeholder: "Ex: 000.000.000-00" },
    { key: "cliente_email", label: "E-mail", type: "email", category: "Cliente", placeholder: "Ex: cliente@email.com" },
    { key: "cliente_telefone", label: "Telefone", type: "text", category: "Cliente", placeholder: "Ex: (00) 00000-0000" },
    { key: "cliente_endereco", label: "Endereço Completo", type: "text", category: "Cliente", placeholder: "Ex: Rua X, 123" },
    { key: "contrato_numero", label: "Número do Contrato", type: "text", category: "Contrato", placeholder: "Ex: 001/2024" },
    { key: "contrato_valor", label: "Valor do Contrato", type: "number", category: "Contrato", placeholder: "Ex: 1500.00" },
    { key: "contrato_inicio", label: "Data de Início", type: "date", category: "Contrato", placeholder: "Ex: 01/01/2024" },
    { key: "contrato_fim", label: "Data de Término", type: "date", category: "Contrato", placeholder: "Ex: 31/12/2024" },
    { key: "servico_nome", label: "Nome do Serviço", type: "text", category: "Serviço", placeholder: "Ex: Manutenção Mensal" },
    { key: "servico_descricao", label: "Descrição do Serviço", type: "textarea", category: "Serviço", placeholder: "Descreva o serviço" },
    { key: "empresa_nome", label: "Nossa Empresa", type: "text", category: "Empresa", placeholder: "Ex: Agência XYZ" },
    { key: "empresa_cnpj", label: "CNPJ da Empresa", type: "text", category: "Empresa", placeholder: "Ex: 00.000.000/0001-00" },
    { key: "data_atual", label: "Data Atual", type: "date", category: "Geral", placeholder: "Data de hoje" },
  ];

  const addPredefinedVariable = (variable: typeof predefinedVariables[0]) => {
    try {
      const currentVars = JSON.parse(form.getValues("variables") || "[]");
      
      // Verificar se já existe
      const exists = currentVars.some((v: any) => v.key === variable.key);
      if (exists) {
        toast({
          title: "Variável já existe",
          description: "Esta variável já foi adicionada ao template",
          variant: "destructive",
        });
        return;
      }

      currentVars.push(variable);
      form.setValue("variables", JSON.stringify(currentVars, null, 2));
      
      toast({
        title: "Variável adicionada",
        description: `{${variable.key}} adicionada com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar variável. Verifique o formato JSON.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {template ? "Editar Template" : "Novo Template"}
          </DialogTitle>
          <DialogDescription>
            Configure o template de documento com HTML, assets e variáveis dinâmicas
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="layout">Layout & Páginas</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Template</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Contrato de Manutenção Mensal" {...field} />
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
                          <Textarea
                            placeholder="Descreva quando usar este template..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="document_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Documento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="contract">Contrato</SelectItem>
                              <SelectItem value="proposal">Proposta Comercial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="service_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serviço</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Todos</SelectItem>
                              {services?.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="template_html"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template HTML</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<div>{{cliente_nome}}, este é seu contrato...</div>"
                            className="font-mono text-sm min-h-[250px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Use variáveis entre chaves duplas: {`{{variavel}}`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Variáveis Disponíveis - Clique para Adicionar</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Selecione as variáveis que você deseja usar no template
                      </p>
                      
                      <div className="space-y-3">
                        {["Cliente", "Contrato", "Serviço", "Empresa", "Geral"].map((category) => (
                          <div key={category}>
                            <h4 className="text-xs font-medium mb-2 text-muted-foreground">{category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {predefinedVariables
                                .filter((v) => v.category === category)
                                .map((variable) => (
                                  <Button
                                    key={variable.key}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addPredefinedVariable(variable)}
                                    className="text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {`{${variable.key}}`}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="variables"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variáveis do Template (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='[{"key": "cliente_nome", "label": "Nome do Cliente", "type": "text"}]'
                              className="font-mono text-sm min-h-[200px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Lista em JSON das variáveis. Use os botões acima para adicionar facilmente.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Template Ativo</FormLabel>
                          <FormDescription>
                            Templates inativos não aparecem para seleção
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="assets" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Papel Timbrado</CardTitle>
                      <CardDescription>
                        Adicione cabeçalho e rodapé que aparecerão em todas as páginas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="header_image_url"
                        render={({ field }) => (
                          <AssetUploader
                            value={field.value}
                            onChange={field.onChange}
                            label="Cabeçalho (Header)"
                            description="Imagem do topo do documento"
                            folder="headers"
                          />
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="footer_image_url"
                        render={({ field }) => (
                          <AssetUploader
                            value={field.value}
                            onChange={field.onChange}
                            label="Rodapé (Footer)"
                            description="Imagem do rodapé do documento"
                            folder="footers"
                          />
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Marca D'água</CardTitle>
                      <CardDescription>
                        Imagem que aparecerá como marca d'água em todo o documento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="watermark_url"
                        render={({ field }) => (
                          <AssetUploader
                            value={field.value}
                            onChange={field.onChange}
                            label="Marca D'água"
                            description="Será exibida com transparência"
                            folder="watermarks"
                          />
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="layout" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações do Documento</CardTitle>
                      <CardDescription>
                        Defina o tamanho do papel e orientação
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="paper_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tamanho</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="A4">A4</SelectItem>
                                  <SelectItem value="Letter">Letter</SelectItem>
                                  <SelectItem value="Legal">Legal</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="orientation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Orientação</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="portrait">Retrato</SelectItem>
                                  <SelectItem value="landscape">Paisagem</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="page_count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Páginas</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={20}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>CSS Personalizado</CardTitle>
                      <CardDescription>
                        Adicione estilos CSS customizados para o documento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="styles"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder=".titulo { font-size: 24px; color: #333; }"
                                className="font-mono text-sm min-h-[200px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Layout das Páginas (JSON)</CardTitle>
                      <CardDescription>
                        Configure backgrounds e margens por página
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="page_layouts"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder='[{"page_number": 1, "background_url": "", "content_margin_top": 100, "content_margin_bottom": 50}]'
                                className="font-mono text-sm min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Array JSON com configurações de cada página
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                  {form.watch("template_html") && (
                    <DocumentPreview
                      template={{
                        page_count: form.watch("page_count"),
                        page_layouts: JSON.parse(form.watch("page_layouts") || "[]"),
                        header_image_url: form.watch("header_image_url"),
                        footer_image_url: form.watch("footer_image_url"),
                        watermark_url: form.watch("watermark_url"),
                        template_html: form.watch("template_html"),
                        styles: form.watch("styles"),
                        paper_size: form.watch("paper_size"),
                        orientation: form.watch("orientation"),
                      }}
                      variablesData={previewData}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {template ? "Atualizar" : "Criar"} Template
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}