import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { 
  Send, 
  Users, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  Filter,
  Info,
  Smartphone,
  RefreshCw,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Smile,
  Mail,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
  nickname: string | null;
  phone: string;
  email: string;
  is_active: boolean | null;
}

interface SendResult {
  clientId: string;
  clientName: string;
  whatsappSuccess?: boolean;
  whatsappError?: string;
  emailSuccess?: boolean;
  emailError?: string;
}

const AVAILABLE_VARIABLES = [
  { key: "{nome}", description: "Nome do cliente" },
  { key: "{empresa}", description: "Nome da empresa" },
  { key: "{apelido}", description: "Apelido do cliente" },
];

const COMMON_EMOJIS = [
  "😊", "👋", "🎉", "🎄", "🎅", "⭐", "✨", "💫", "🌟", "💪",
  "👍", "❤️", "🙏", "📢", "📣", "🔔", "✅", "⚡", "🚀", "💼",
  "📅", "🎁", "🎊", "🥳", "😄", "🤝", "💬", "📱", "💡", "🔥"
];

const INTERVAL_OPTIONS = [
  { value: "3", label: "3 segundos (rápido)" },
  { value: "5", label: "5 segundos (recomendado)" },
  { value: "10", label: "10 segundos (seguro)" },
  { value: "15", label: "15 segundos (muito seguro)" },
  { value: "30", label: "30 segundos (ultra seguro)" },
];

export default function BroadcastMessages() {
  const { toast } = useToast();
  const { status: whatsappStatus, checkStatus, isChecking } = useWhatsAppStatus(true);
  
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [intervalSeconds, setIntervalSeconds] = useState("5");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [currentSendingClient, setCurrentSendingClient] = useState<string | null>(null);
  
  // Channel selection
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  
  // Email integration status
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  // Check if email is configured
  const { data: emailSettings } = useQuery({
    queryKey: ["email-settings-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("key, value, is_active")
        .in("key", ["email_enabled", "smtp_host", "smtp_user"]);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (emailSettings) {
      const enabled = emailSettings.find(s => s.key === "email_enabled");
      const host = emailSettings.find(s => s.key === "smtp_host");
      const user = emailSettings.find(s => s.key === "smtp_user");
      
      const isConfigured = enabled?.value === "true" && 
        enabled?.is_active && 
        host?.value && 
        user?.value;
      
      setEmailConfigured(!!isConfigured);
    }
  }, [emailSettings]);

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, company_name, nickname, phone, email, is_active")
        .order("company_name", { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
  });

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Filter by status
      if (filterStatus === "active" && !client.is_active) return false;
      if (filterStatus === "inactive" && client.is_active) return false;

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (client.nickname || client.company_name || client.full_name || "").toLowerCase();
        const phone = client.phone?.toLowerCase() || "";
        const email = client.email?.toLowerCase() || "";
        return name.includes(query) || phone.includes(query) || email.includes(query);
      }

      return true;
    });
  }, [clients, searchQuery, filterStatus]);

  // Clients with valid contact info based on selected channels
  const eligibleClients = useMemo(() => {
    return filteredClients.filter((c) => {
      const hasPhone = c.phone && c.phone.length >= 10;
      const hasEmail = c.email && c.email.includes("@");
      
      if (sendWhatsApp && sendEmail) {
        return hasPhone || hasEmail;
      } else if (sendWhatsApp) {
        return hasPhone;
      } else if (sendEmail) {
        return hasEmail;
      }
      return false;
    });
  }, [filteredClients, sendWhatsApp, sendEmail]);

  const getClientDisplayName = (client: Client) => {
    return client.nickname || client.company_name || client.full_name || "Sem nome";
  };

  const personalizeMessage = (msg: string, client: Client) => {
    return msg
      .replace(/{nome}/g, client.full_name || client.company_name || "Cliente")
      .replace(/{empresa}/g, client.company_name || "")
      .replace(/{apelido}/g, client.nickname || client.full_name || "Cliente");
  };

  const convertWhatsAppToHtml = (text: string): string => {
    // Convert WhatsApp formatting to HTML
    let html = text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      .replace(/```([^`]+)```/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    
    return html;
  };

  const insertVariable = (variable: string) => {
    setMessage((prev) => prev + variable);
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const insertFormatting = (format: "bold" | "italic" | "strike" | "mono") => {
    const formatChars = {
      bold: "*",
      italic: "_",
      strike: "~",
      mono: "```",
    };
    const char = formatChars[format];
    setMessage((prev) => prev + char + "texto" + char);
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === eligibleClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(eligibleClients.map((c) => c.id)));
    }
  };

  const toggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const sendBroadcast = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem para enviar",
        variant: "destructive",
      });
      return;
    }

    if (selectedClients.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente para enviar",
        variant: "destructive",
      });
      return;
    }

    if (!sendWhatsApp && !sendEmail) {
      toast({
        title: "Nenhum canal selecionado",
        description: "Selecione pelo menos um canal de envio (WhatsApp ou E-mail)",
        variant: "destructive",
      });
      return;
    }

    if (sendWhatsApp && whatsappStatus !== "connected") {
      toast({
        title: "WhatsApp desconectado",
        description: "Verifique a conexão com o WhatsApp ou desmarque essa opção",
        variant: "destructive",
      });
      return;
    }

    if (sendEmail && !emailConfigured) {
      toast({
        title: "E-mail não configurado",
        description: "Configure o SMTP nas integrações ou desmarque essa opção",
        variant: "destructive",
      });
      return;
    }

    if (sendEmail && !emailSubject.trim()) {
      toast({
        title: "Assunto do e-mail vazio",
        description: "Digite um assunto para o e-mail",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    setSendResults([]);

    const selectedClientsList = eligibleClients.filter((c) => selectedClients.has(c.id));
    const total = selectedClientsList.length;
    const interval = parseInt(intervalSeconds) * 1000;
    const results: SendResult[] = [];

    for (let i = 0; i < selectedClientsList.length; i++) {
      const client = selectedClientsList[i];
      setCurrentSendingClient(getClientDisplayName(client));

      const result: SendResult = {
        clientId: client.id,
        clientName: getClientDisplayName(client),
      };

      const personalizedMessage = personalizeMessage(message, client);
      const hasPhone = client.phone && client.phone.length >= 10;
      const hasEmail = client.email && client.email.includes("@");

      // Send WhatsApp
      if (sendWhatsApp && hasPhone) {
        try {
          const { data, error } = await supabase.functions.invoke("send-whatsapp", {
            body: {
              action: "send_message",
              phone: client.phone,
              message: personalizedMessage,
            },
          });

          if (error || !data?.success) {
            result.whatsappSuccess = false;
            result.whatsappError = error?.message || data?.error || "Erro desconhecido";
          } else {
            result.whatsappSuccess = true;
          }
        } catch (err: any) {
          result.whatsappSuccess = false;
          result.whatsappError = err.message;
        }
      }

      // Send Email
      if (sendEmail && hasEmail) {
        try {
          const htmlMessage = convertWhatsAppToHtml(personalizedMessage);
          const personalizedSubject = personalizeMessage(emailSubject, client);

          const { data, error } = await supabase.functions.invoke("send-email", {
            body: {
              to: client.email,
              subject: personalizedSubject,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  ${htmlMessage}
                </div>
              `,
            },
          });

          if (error) {
            result.emailSuccess = false;
            result.emailError = error?.message || "Erro ao enviar e-mail";
          } else {
            result.emailSuccess = true;
          }
        } catch (err: any) {
          result.emailSuccess = false;
          result.emailError = err.message;
        }
      }

      results.push(result);
      setSendProgress(((i + 1) / total) * 100);
      setSendResults([...results]);

      // Wait interval before next message (except for last one)
      if (i < selectedClientsList.length - 1) {
        await sleep(interval);
      }
    }

    setIsSending(false);
    setCurrentSendingClient(null);

    const whatsappSuccess = results.filter((r) => r.whatsappSuccess).length;
    const whatsappFail = results.filter((r) => r.whatsappSuccess === false).length;
    const emailSuccess = results.filter((r) => r.emailSuccess).length;
    const emailFail = results.filter((r) => r.emailSuccess === false).length;

    const totalSuccess = whatsappSuccess + emailSuccess;
    const totalFail = whatsappFail + emailFail;

    toast({
      title: "Envio concluído",
      description: `${totalSuccess} enviados com sucesso, ${totalFail} falharam`,
      variant: totalFail > 0 ? "destructive" : "default",
    });
  };

  const previewMessage = useMemo(() => {
    if (!message) return "";
    const sampleClient: Client = {
      id: "sample",
      full_name: "João Silva",
      company_name: "Empresa Exemplo",
      nickname: "João",
      phone: "11999999999",
      email: "joao@exemplo.com",
      is_active: true,
    };
    return personalizeMessage(message, sampleClient);
  }, [message]);

  const getClientChannelInfo = (client: Client) => {
    const hasPhone = client.phone && client.phone.length >= 10;
    const hasEmail = client.email && client.email.includes("@");
    return { hasPhone, hasEmail };
  };

  // Calculate results summary
  const resultsSummary = useMemo(() => {
    return {
      whatsappSuccess: sendResults.filter((r) => r.whatsappSuccess).length,
      whatsappFail: sendResults.filter((r) => r.whatsappSuccess === false).length,
      emailSuccess: sendResults.filter((r) => r.emailSuccess).length,
      emailFail: sendResults.filter((r) => r.emailSuccess === false).length,
    };
  }, [sendResults]);

  const canSend = useMemo(() => {
    if (selectedClients.size === 0 || !message.trim() || isSending) return false;
    if (!sendWhatsApp && !sendEmail) return false;
    if (sendWhatsApp && whatsappStatus !== "connected") return false;
    if (sendEmail && !emailConfigured) return false;
    if (sendEmail && !emailSubject.trim()) return false;
    return true;
  }, [selectedClients.size, message, isSending, sendWhatsApp, sendEmail, whatsappStatus, emailConfigured, emailSubject]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Disparos de Informações e Alertas</h1>
            <p className="text-muted-foreground">
              Envie mensagens personalizadas para múltiplos clientes via WhatsApp e E-mail
            </p>
          </div>
        </div>

        {/* Channel Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Canais de Envio</CardTitle>
            <CardDescription>Selecione os canais para enviar a mensagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {/* WhatsApp Channel */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="channel-whatsapp"
                  checked={sendWhatsApp}
                  onCheckedChange={(checked) => setSendWhatsApp(!!checked)}
                />
                <label htmlFor="channel-whatsapp" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-medium">WhatsApp</span>
                </label>
                <Badge
                  variant={
                    whatsappStatus === "connected"
                      ? "default"
                      : whatsappStatus === "checking"
                      ? "secondary"
                      : "destructive"
                  }
                  className="gap-1"
                >
                  {whatsappStatus === "connected"
                    ? "Conectado"
                    : whatsappStatus === "checking"
                    ? "Verificando..."
                    : "Desconectado"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => checkStatus()}
                  disabled={isChecking}
                >
                  <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
                </Button>
              </div>

              {/* Email Channel */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="channel-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(!!checked)}
                />
                <label htmlFor="channel-email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">E-mail</span>
                </label>
                <Badge
                  variant={
                    emailConfigured === null
                      ? "secondary"
                      : emailConfigured
                      ? "default"
                      : "destructive"
                  }
                  className="gap-1"
                >
                  {emailConfigured === null
                    ? "Verificando..."
                    : emailConfigured
                    ? "Configurado"
                    : "Não configurado"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagem
              </CardTitle>
              <CardDescription>
                Redija sua mensagem com formatação e variáveis de personalização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Subject (only when email is selected) */}
              {sendEmail && (
                <div className="space-y-2">
                  <Label htmlFor="email-subject" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Assunto do E-mail
                  </Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Ex: Aviso importante - Recesso de fim de ano"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode usar as mesmas variáveis: {"{nome}"}, {"{empresa}"}, {"{apelido}"}
                  </p>
                </div>
              )}

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 p-1 border rounded-md bg-muted/50">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("bold")}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Negrito (*texto*)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("italic")}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Itálico (_texto_)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("strike")}
                      >
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Riscado (~texto~)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("mono")}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Monoespaçado (```texto```)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Emoji Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="grid grid-cols-6 gap-1">
                      {COMMON_EMOJIS.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="text-lg p-1 h-8 w-8"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Message Input */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem aqui...

Exemplo:
Olá {nome}! 👋

Esperamos que esteja tudo bem com você e com a *{empresa}*!

Gostaríamos de informar sobre o nosso recesso de fim de ano..."
                className="min-h-[200px] font-mono text-sm"
              />

              {/* Variables */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Variáveis de personalização (clique para inserir):
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <TooltipProvider key={variable.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => insertVariable(variable.key)}
                          >
                            {variable.key}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{variable.description}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewMessage && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Pré-visualização (exemplo):
                  </Label>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm whitespace-pre-wrap">
                    {previewMessage}
                  </div>
                </div>
              )}

              {/* Interval Setting */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Intervalo entre envios
                </Label>
                <Select value={intervalSeconds} onValueChange={setIntervalSeconds}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tempo estimado: {((selectedClients.size * parseInt(intervalSeconds)) / 60).toFixed(1)} minutos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Selecionar Clientes
              </CardTitle>
              <CardDescription>
                {selectedClients.size} de {eligibleClients.length} clientes selecionados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone, e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      eligibleClients.length > 0 &&
                      selectedClients.size === eligibleClients.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">Selecionar todos</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {eligibleClients.length} com contato válido
                </span>
              </div>

              <Separator />

              {/* Client List */}
              <ScrollArea className="h-[400px]">
                {isLoadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : eligibleClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado com contato válido para os canais selecionados
                  </div>
                ) : (
                  <div className="space-y-1">
                    {eligibleClients.map((client) => {
                      const { hasPhone, hasEmail } = getClientChannelInfo(client);
                      return (
                        <div
                          key={client.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selectedClients.has(client.id)
                              ? "bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleClient(client.id)}
                        >
                          <Checkbox
                            checked={selectedClients.has(client.id)}
                            onCheckedChange={() => toggleClient(client.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {getClientDisplayName(client)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {hasPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </span>
                              )}
                              {hasEmail && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {sendWhatsApp && hasPhone && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                                      <Smartphone className="h-3 w-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Receberá via WhatsApp</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {sendEmail && hasEmail && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                                      <Mail className="h-3 w-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Receberá via E-mail</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {!client.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Send Progress */}
        {(isSending || sendResults.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Envio Concluído
                  </>
                )}
              </CardTitle>
              {isSending && currentSendingClient && (
                <CardDescription>
                  Enviando para: {currentSendingClient}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={sendProgress} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* WhatsApp Results */}
                {sendWhatsApp && (
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-1">
                      <Smartphone className="h-4 w-4" /> WhatsApp
                    </p>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {resultsSummary.whatsappSuccess} enviados
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {resultsSummary.whatsappFail} falharam
                      </span>
                    </div>
                  </div>
                )}

                {/* Email Results */}
                {sendEmail && (
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4" /> E-mail
                    </p>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {resultsSummary.emailSuccess} enviados
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {resultsSummary.emailFail} falharam
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {sendResults.some((r) => r.whatsappSuccess === false || r.emailSuccess === false) && (
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1">
                    {sendResults
                      .filter((r) => r.whatsappSuccess === false || r.emailSuccess === false)
                      .map((result) => (
                        <div key={result.clientId} className="text-sm">
                          <span className="font-medium">{result.clientName}:</span>
                          {result.whatsappSuccess === false && (
                            <span className="flex items-center gap-1 text-red-600 ml-2">
                              <Smartphone className="h-3 w-3" />
                              {result.whatsappError}
                            </span>
                          )}
                          {result.emailSuccess === false && (
                            <span className="flex items-center gap-1 text-red-600 ml-2">
                              <Mail className="h-3 w-3" />
                              {result.emailError}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warning */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Envios em massa devem seguir as políticas do WhatsApp e de e-mail.
            Use intervalos adequados entre mensagens para evitar bloqueios. Mensagens devem ser
            relevantes e os destinatários devem ter consentido em recebê-las.
          </AlertDescription>
        </Alert>

        {/* Send Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={sendBroadcast}
            disabled={!canSend}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando ({Math.round(sendProgress)}%)
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar para {selectedClients.size} cliente{selectedClients.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
