import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AVAILABLE_VARIABLES = {
  ticket_created_admin: [
    "{ticket_number}", "{client_name}", "{contact_name}", "{department}",
    "{priority}", "{subject}", "{description}"
  ],
  ticket_created_client: [
    "{ticket_number}", "{client_name}", "{contact_name}", "{subject}"
  ],
  admin_response: [
    "{ticket_number}", "{contact_name}", "{admin_name}", "{subject}", "{message}"
  ],
  status_changed: [
    "{ticket_number}", "{contact_name}", "{subject}", "{old_status}", "{new_status}"
  ],
  ticket_message: [
    "{ticket_number}", "{contact_name}", "{client_name}", "{subject}", "{message}"
  ],
  ticket_deleted: [
    "{ticket_number}", "{contact_name}", "{subject}"
  ]
};

export function TicketWhatsAppSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateTexts, setTemplateTexts] = useState<Record<string, string>>({});
  const [templateStates, setTemplateStates] = useState<Record<string, boolean>>({});

  const { data: templates, isLoading } = useQuery({
    queryKey: ["ticket-whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_whatsapp_templates")
        .select("*")
        .order("template_key");

      if (error) throw error;
      
      const textsMap: Record<string, string> = {};
      const statesMap: Record<string, boolean> = {};
      data?.forEach(template => {
        textsMap[template.template_key] = template.template_text;
        statesMap[template.template_key] = template.is_active;
      });
      setTemplateTexts(textsMap);
      setTemplateStates(statesMap);
      
      return data;
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ key, text, isActive }: { key: string; text?: string; isActive?: boolean }) => {
      const updateData: any = {};
      if (text !== undefined) updateData.template_text = text;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { error } = await supabase
        .from("ticket_whatsapp_templates")
        .update(updateData)
        .eq("template_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-whatsapp-templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveTemplate = (key: string) => {
    updateTemplateMutation.mutate({ key, text: templateTexts[key] });
  };

  const handleToggleActive = (key: string, isActive: boolean) => {
    setTemplateStates(prev => ({ ...prev, [key]: isActive }));
    updateTemplateMutation.mutate({ key, isActive });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure os templates de mensagens WhatsApp enviadas automaticamente para diferentes eventos de tickets.
          Use as variáveis disponíveis para personalizar as mensagens.
        </AlertDescription>
      </Alert>

      {templates?.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {template.name}
                </CardTitle>
                <CardDescription className="mt-2">{template.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${template.template_key}`} className="text-sm">
                  Ativo
                </Label>
                <Switch
                  id={`active-${template.template_key}`}
                  checked={templateStates[template.template_key] ?? template.is_active}
                  onCheckedChange={(checked) => handleToggleActive(template.template_key, checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`template-${template.template_key}`}>Mensagem</Label>
              <Textarea
                id={`template-${template.template_key}`}
                value={templateTexts[template.template_key] ?? template.template_text}
                onChange={(e) => {
                  setTemplateTexts(prev => ({ ...prev, [template.template_key]: e.target.value }));
                  setEditingTemplate(template.template_key);
                }}
                rows={8}
                className="mt-2 font-mono text-sm"
                disabled={updateTemplateMutation.isPending}
              />
            </div>

            <div className="rounded-md bg-muted p-4">
              <h4 className="text-sm font-medium mb-2">Variáveis disponíveis:</h4>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES[template.template_key as keyof typeof AVAILABLE_VARIABLES]?.map((variable) => (
                  <code
                    key={variable}
                    className="px-2 py-1 rounded bg-background text-xs font-mono cursor-pointer hover:bg-accent"
                    onClick={() => {
                      const textarea = document.getElementById(`template-${template.template_key}`) as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = templateTexts[template.template_key] ?? template.template_text;
                        const newText = text.substring(0, start) + variable + text.substring(end);
                        setTemplateTexts(prev => ({ ...prev, [template.template_key]: newText }));
                        setEditingTemplate(template.template_key);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + variable.length, start + variable.length);
                        }, 0);
                      }
                    }}
                  >
                    {variable}
                  </code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Clique em uma variável para inseri-la no cursor
              </p>
            </div>

            {editingTemplate === template.template_key && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSaveTemplate(template.template_key)}
                  disabled={updateTemplateMutation.isPending}
                >
                  Salvar Alterações
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateTexts(prev => ({ ...prev, [template.template_key]: template.template_text }));
                    setEditingTemplate(null);
                  }}
                  disabled={updateTemplateMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
