import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface WhatsAppTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  template_text: string;
  is_active: boolean;
}

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  ticket_created_admin: [
    "{ticket_number}",
    "{client_name}",
    "{contact_name}",
    "{department}",
    "{priority}",
    "{subject}",
    "{description}"
  ],
  ticket_created_client: [
    "{client_name}",
    "{contact_name}",
    "{ticket_number}",
    "{subject}"
  ],
  admin_response: [
    "{ticket_number}",
    "{contact_name}",
    "{admin_name}",
    "{subject}",
    "{message}"
  ],
  status_changed: [
    "{ticket_number}",
    "{contact_name}",
    "{subject}",
    "{old_status}",
    "{new_status}"
  ],
  ticket_message: [
    "{ticket_number}",
    "{contact_name}",
    "{client_name}",
    "{subject}",
    "{message}"
  ],
  ticket_deleted: [
    "{ticket_number}",
    "{contact_name}",
    "{subject}"
  ]
};

export function TicketWhatsAppSettingsTab() {
  const queryClient = useQueryClient();
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});

  const { data: templates, isLoading } = useQuery({
    queryKey: ["ticket-whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_whatsapp_templates")
        .select("*")
        .order("template_key");

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template_text }: { id: string; template_text: string }) => {
      const { error } = await supabase
        .from("ticket_whatsapp_templates")
        .update({ template_text })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-whatsapp-templates"] });
      toast.success("Template atualizado com sucesso");
      setEditedTemplates({});
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const handleTemplateChange = (templateId: string, value: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [templateId]: value
    }));
  };

  const handleSaveTemplate = (templateId: string) => {
    const template_text = editedTemplates[templateId];
    if (template_text !== undefined) {
      updateTemplateMutation.mutate({ id: templateId, template_text });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Templates de WhatsApp para Tickets</h3>
        <p className="text-sm text-muted-foreground">
          Configure as mensagens automáticas enviadas via WhatsApp para diferentes eventos de tickets.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Use as variáveis disponíveis entre chaves {} para personalizar as mensagens.
          As variáveis serão substituídas pelos valores reais ao enviar a mensagem.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {templates?.map((template) => {
          const currentValue = editedTemplates[template.id] ?? template.template_text;
          const hasChanges = editedTemplates[template.id] !== undefined;
          const variables = TEMPLATE_VARIABLES[template.template_key] || [];

          return (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Variáveis Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((variable) => (
                      <code
                        key={variable}
                        className="px-2 py-1 bg-muted text-xs rounded font-mono cursor-pointer hover:bg-accent"
                        onClick={() => {
                          navigator.clipboard.writeText(variable);
                          toast.success(`${variable} copiado`);
                        }}
                      >
                        {variable}
                      </code>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor={`template-${template.id}`}>Mensagem</Label>
                  <Textarea
                    id={`template-${template.id}`}
                    value={currentValue}
                    onChange={(e) => handleTemplateChange(template.id, e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveTemplate(template.id)}
                    disabled={!hasChanges || updateTemplateMutation.isPending}
                  >
                    {updateTemplateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Template
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}