import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Smile
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
  success: boolean;
  error?: string;
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

export default function WhatsAppBroadcast() {
  const { toast } = useToast();
  const { status: whatsappStatus, checkStatus, isChecking } = useWhatsAppStatus(true);
  
  const [message, setMessage] = useState("");
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [intervalSeconds, setIntervalSeconds] = useState("5");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [currentSendingClient, setCurrentSendingClient] = useState<string | null>(null);

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

  // Clients with valid phone numbers
  const clientsWithPhone = useMemo(() => {
    return filteredClients.filter((c) => c.phone && c.phone.length >= 10);
  }, [filteredClients]);

  const getClientDisplayName = (client: Client) => {
    return client.nickname || client.company_name || client.full_name || "Sem nome";
  };

  const personalizeMessage = (msg: string, client: Client) => {
    return msg
      .replace(/{nome}/g, client.full_name || client.company_name || "Cliente")
      .replace(/{empresa}/g, client.company_name || "")
      .replace(/{apelido}/g, client.nickname || client.full_name || "Cliente");
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
    if (selectedClients.size === clientsWithPhone.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clientsWithPhone.map((c) => c.id)));
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

    if (whatsappStatus !== "connected") {
      toast({
        title: "WhatsApp desconectado",
        description: "Verifique a conexão com o WhatsApp antes de enviar",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    setSendResults([]);

    const selectedClientsList = clientsWithPhone.filter((c) => selectedClients.has(c.id));
    const total = selectedClientsList.length;
    const interval = parseInt(intervalSeconds) * 1000;
    const results: SendResult[] = [];

    for (let i = 0; i < selectedClientsList.length; i++) {
      const client = selectedClientsList[i];
      setCurrentSendingClient(getClientDisplayName(client));

      try {
        const personalizedMessage = personalizeMessage(message, client);

        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            action: "send_message",
            phone: client.phone,
            message: personalizedMessage,
          },
        });

        if (error || !data?.success) {
          results.push({
            clientId: client.id,
            clientName: getClientDisplayName(client),
            success: false,
            error: error?.message || data?.error || "Erro desconhecido",
          });
        } else {
          results.push({
            clientId: client.id,
            clientName: getClientDisplayName(client),
            success: true,
          });
        }
      } catch (err: any) {
        results.push({
          clientId: client.id,
          clientName: getClientDisplayName(client),
          success: false,
          error: err.message,
        });
      }

      setSendProgress(((i + 1) / total) * 100);
      setSendResults([...results]);

      // Wait interval before next message (except for last one)
      if (i < selectedClientsList.length - 1) {
        await sleep(interval);
      }
    }

    setIsSending(false);
    setCurrentSendingClient(null);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    toast({
      title: "Envio concluído",
      description: `${successCount} enviados com sucesso, ${failCount} falharam`,
      variant: failCount > 0 ? "destructive" : "default",
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Disparos em Massa</h1>
            <p className="text-muted-foreground">
              Envie mensagens personalizadas para múltiplos clientes via WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              <Smartphone className="h-3 w-3" />
              {whatsappStatus === "connected"
                ? "Conectado"
                : whatsappStatus === "checking"
                ? "Verificando..."
                : "Desconectado"}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => checkStatus()}
              disabled={isChecking}
            >
              <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
            </Button>
          </div>
        </div>

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
                {selectedClients.size} de {clientsWithPhone.length} clientes selecionados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone..."
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
                      clientsWithPhone.length > 0 &&
                      selectedClients.size === clientsWithPhone.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">Selecionar todos</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {clientsWithPhone.length} com telefone válido
                </span>
              </div>

              <Separator />

              {/* Client List */}
              <ScrollArea className="h-[400px]">
                {isLoadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : clientsWithPhone.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado com telefone válido
                  </div>
                ) : (
                  <div className="space-y-1">
                    {clientsWithPhone.map((client) => (
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
                          <p className="text-xs text-muted-foreground truncate">
                            {client.phone}
                          </p>
                        </div>
                        {!client.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    ))}
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

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {sendResults.filter((r) => r.success).length} enviados
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  {sendResults.filter((r) => !r.success).length} falharam
                </div>
              </div>

              {sendResults.some((r) => !r.success) && (
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1">
                    {sendResults
                      .filter((r) => !r.success)
                      .map((result) => (
                        <div
                          key={result.clientId}
                          className="flex items-center gap-2 text-sm text-red-600"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>{result.clientName}:</span>
                          <span className="text-muted-foreground">{result.error}</span>
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
            <strong>Importante:</strong> Envios em massa devem seguir as políticas do WhatsApp.
            Use intervalos adequados entre mensagens para evitar bloqueios. Mensagens devem ser
            relevantes e os destinatários devem ter consentido em recebê-las.
          </AlertDescription>
        </Alert>

        {/* Send Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={sendBroadcast}
            disabled={isSending || selectedClients.size === 0 || !message.trim() || whatsappStatus !== "connected"}
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
