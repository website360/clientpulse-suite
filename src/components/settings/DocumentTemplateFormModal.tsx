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
import { Loader2, Upload } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  document_type: z.enum(["contract", "proposal"]),
  service_id: z.string().optional(),
  template_html: z.string().min(1, "Template HTML é obrigatório"),
  variables: z.string().optional(),
  is_active: z.boolean().default(true),
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
      });
    }
  }, [template, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let parsedVariables = [];
      try {
        parsedVariables = JSON.parse(values.variables || "[]");
      } catch (e) {
        throw new Error("Variáveis JSON inválido");
      }

      const templateData = {
        name: values.name,
        description: values.description || null,
        document_type: values.document_type,
        service_id: values.service_id || null,
        template_html: values.template_html,
        variables: parsedVariables,
        is_active: values.is_active,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Novo Template"}
          </DialogTitle>
          <DialogDescription>
            Configure o template de documento com HTML e variáveis dinâmicas
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>Descrição (Opcional)</FormLabel>
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
                    <FormLabel>Serviço (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os serviços" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Todos os serviços</SelectItem>
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
                      className="font-mono text-sm min-h-[200px]"
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

            <FormField
              control={form.control}
              name="variables"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variáveis (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='[{"name": "cliente_nome", "label": "Nome do Cliente", "type": "text"}]'
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Array JSON com as variáveis disponíveis no template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end gap-2 pt-4">
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