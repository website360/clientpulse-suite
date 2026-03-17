import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  Mail, 
  MessageCircle, 
  Send,
  Paperclip, 
  MoreVertical,
  Archive,
  Trash2,
  Star,
  StarOff,
  Phone,
  Video,
  Circle,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Plus,
  Check,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { ConnectWhatsAppDialog } from '@/components/messages/ConnectWhatsAppDialog';
import { ConnectEmailDialog } from '@/components/messages/ConnectEmailDialog';
import { EditAccountDialog } from '@/components/messages/EditAccountDialog';
import { SyncEmailDialog } from '@/components/messages/SyncEmailDialog';
import { EmailView } from '@/components/messages/EmailView';
import { toast } from '@/hooks/use-toast';
import { fetchMessages, syncEmailAccount, sendEmailMessage } from '@/lib/email-sync';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  type: 'whatsapp' | 'email';
  sender: string;
  senderEmail?: string;
  subject?: string;
  preview: string;
  content?: string;
  htmlContent?: string;
  timestamp: string;
  date?: string;
  read: boolean;
  starred: boolean;
  avatar?: string;
  receivedOnAccountId: string; // Which account received this message
}

interface ConnectedAccount {
  id: string;
  type: 'whatsapp' | 'email';
  name: string;
  identifier: string; // phone number or email address
  isActive: boolean;
  status: 'connected' | 'disconnected';
  config?: {
    imap?: { server: string; port: number };
    smtp?: { server: string; port: number };
    password?: string;
  };
}

const mockAccounts: ConnectedAccount[] = [
  {
    id: '1',
    type: 'whatsapp',
    name: 'WhatsApp Principal',
    identifier: '+55 11 98765-4321',
    isActive: true,
    status: 'connected',
  },
  {
    id: '2',
    type: 'whatsapp',
    name: 'WhatsApp Suporte',
    identifier: '+55 11 91234-5678',
    isActive: true,
    status: 'connected',
  },
  {
    id: '3',
    type: 'email',
    name: 'Email Comercial',
    identifier: 'comercial@empresa.com',
    isActive: true,
    status: 'connected',
  },
  {
    id: '4',
    type: 'email',
    name: 'Email Suporte',
    identifier: 'suporte@empresa.com',
    isActive: true,
    status: 'connected',
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'whatsapp',
    sender: 'João Silva',
    preview: 'Olá! Gostaria de saber mais informações sobre o projeto...',
    timestamp: '10:30',
    read: false,
    starred: true,
    receivedOnAccountId: '1', // WhatsApp Principal
  },
  {
    id: '2',
    type: 'email',
    sender: 'Maria Santos',
    senderEmail: 'maria@example.com',
    subject: 'Proposta Comercial - Revisão',
    preview: 'Segue em anexo a proposta revisada conforme solicitado...',
    timestamp: '09:15',
    read: true,
    starred: false,
    receivedOnAccountId: '3', // Email Comercial
  },
  {
    id: '3',
    type: 'whatsapp',
    sender: 'Pedro Costa',
    preview: 'Bom dia! Quando podemos agendar uma reunião?',
    timestamp: 'Ontem',
    read: true,
    starred: false,
    receivedOnAccountId: '2', // WhatsApp Suporte
  },
  {
    id: '4',
    type: 'email',
    sender: 'Ana Oliveira',
    senderEmail: 'ana@example.com',
    subject: 'Dúvida sobre contrato',
    preview: 'Prezados, tenho algumas dúvidas sobre as cláusulas do contrato...',
    timestamp: 'Ontem',
    read: false,
    starred: false,
    receivedOnAccountId: '4', // Email Suporte
  },
];

export default function Messages() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(mockMessages[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<{
    id: string;
    text: string;
    timestamp: string;
    isSent: boolean;
    attachments?: string[];
  }>>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedInboxAccount, setSelectedInboxAccount] = useState<string>('all'); // 'all' or account ID
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => {
    const saved = localStorage.getItem('connectedAccounts');
    return saved ? JSON.parse(saved) : mockAccounts;
  });
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ConnectedAccount | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncingAccount, setSyncingAccount] = useState<ConnectedAccount | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist connected accounts to localStorage
  useEffect(() => {
    localStorage.setItem('connectedAccounts', JSON.stringify(connectedAccounts));
  }, [connectedAccounts]);

  // Load messages from database
  useEffect(() => {
    const loadDbMessages = async () => {
      try {
        console.log('[Messages] Loading messages, filter:', selectedInboxAccount);
        const messages = await fetchMessages(selectedInboxAccount === 'all' ? undefined : selectedInboxAccount);
        console.log('[Messages] DB returned:', messages?.length, 'messages', messages);
        setDbMessages(messages || []);
        if (messages && messages.length > 0) {
          toast({ title: `${messages.length} mensagens carregadas do banco`, variant: 'default' as const });
        } else {
          console.warn('[Messages] No messages returned from DB - check RLS policies and if messages table has data');
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({ title: 'Erro ao carregar mensagens', description: String(error), variant: 'destructive' as const });
        setDbMessages([]);
      }
    };
    loadDbMessages();
  }, [selectedInboxAccount]);

  // Auto-refresh messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const messages = await fetchMessages(selectedInboxAccount === 'all' ? undefined : selectedInboxAccount);
        setDbMessages(messages || []);
      } catch (error) {
        console.error('Error refreshing messages:', error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedInboxAccount]);


  // Auto-select reply account based on which account received the selected message
  const replyFromAccount = selectedMessage 
    ? connectedAccounts.find(acc => acc.id === selectedMessage.receivedOnAccountId)
    : null;

  // Combine mock messages with database messages
  const combinedMessages = [
    ...mockMessages,
    ...dbMessages.map(dbMsg => ({
      id: dbMsg.id,
      type: dbMsg.message_type as 'whatsapp' | 'email',
      sender: dbMsg.sender_name || 'Unknown',
      senderEmail: dbMsg.sender_email,
      subject: dbMsg.subject,
      preview: (dbMsg.content || '').substring(0, 100),
      content: dbMsg.content,
      htmlContent: dbMsg.html_content,
      timestamp: new Date(dbMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(dbMsg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      read: dbMsg.is_read || false,
      starred: dbMsg.is_starred || false,
      receivedOnAccountId: dbMsg.account_id,
    }))
  ];

  const filteredMessages = combinedMessages.filter(msg => {
    const matchesSearch = msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || msg.type === filterType;
    const matchesInbox = selectedInboxAccount === 'all' || msg.receivedOnAccountId === selectedInboxAccount;
    return matchesSearch && matchesType && matchesInbox;
  });

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    const text = messageText;
    const newMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isSent: true,
      attachments: attachments.map(file => file.name),
    };
    
    setConversationMessages(prev => [...prev, newMessage]);
    setMessageText('');
    setAttachments([]);
    setShowEmojiPicker(false);

    // If replying to an email and we have SMTP config, actually send
    const account = replyFromAccount || connectedAccounts.find(a => a.type === 'email' && a.config?.password);
    if (selectedMessage?.type === 'email' && account?.config?.smtp?.server && account?.config?.password) {
      try {
        const result = await sendEmailMessage({
          accountId: account.id,
          fromEmail: account.identifier,
          fromName: account.name,
          to: selectedMessage.senderEmail || '',
          subject: `Re: ${selectedMessage.subject || ''}`,
          text,
          smtpServer: account.config.smtp.server,
          smtpPort: account.config.smtp.port || 465,
          password: account.config.password,
        });

        if (result.success) {
          toast({
            title: 'Email enviado!',
            description: `Enviado para ${selectedMessage.senderEmail}`,
            variant: 'success' as const,
          });
        } else {
          toast({
            title: 'Erro ao enviar email',
            description: result.error || 'Erro desconhecido',
            variant: 'destructive' as const,
          });
        }
      } catch (error) {
        toast({
          title: 'Erro ao enviar',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive' as const,
        });
      }
    } else {
      toast({
        title: 'Mensagem enviada!',
        description: `Enviada via ${account?.name || 'conta padrão'}`,
        variant: 'success' as const,
      });
    }
  };

  const handleAccountConnected = (newAccount: ConnectedAccount) => {
    setConnectedAccounts(prev => [...prev, newAccount]);
  };

  const handleDisconnectAccount = (accountId: string) => {
    setConnectedAccounts(prev => prev.filter(acc => acc.id !== accountId));
    if (selectedInboxAccount === accountId) {
      setSelectedInboxAccount('all');
    }
    toast({
      title: 'Conta desconectada',
      description: 'A conta foi removida com sucesso.',
      variant: 'warning' as const,
    });
  };

  const handleEditAccount = (account: ConnectedAccount) => {
    setEditingAccount(account);
    setShowEditDialog(true);
  };

  const handleAccountUpdated = (updatedAccount: ConnectedAccount) => {
    setConnectedAccounts(prev => 
      prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
    );
  };

  const handleSyncAccount = async (account: ConnectedAccount) => {
    if (account.type !== 'email') return;

    const password = account.config?.password;
    const imapServer = account.config?.imap?.server;
    const imapPort = account.config?.imap?.port || 993;

    if (!password || !imapServer) {
      // No stored config - open dialog to ask
      setSyncingAccount(account);
      setShowSyncDialog(true);
      return;
    }

    // Has stored config - sync directly
    setIsLoadingMessages(true);
    toast({
      title: 'Sincronizando...',
      description: `Buscando emails de ${account.name}`,
    });

    try {
      const result = await syncEmailAccount(
        account.id,
        password,
        account.identifier,
        imapServer,
        imapPort
      );

      if (result.success) {
        toast({
          title: 'Emails sincronizados!',
          description: `${result.messagesCount || 0} mensagem(ns) encontrada(s).`,
          variant: 'success' as const,
        });
        // Reload messages
        const msgs = await fetchMessages(selectedInboxAccount === 'all' ? undefined : selectedInboxAccount);
        setDbMessages(msgs || []);
      } else {
        toast({
          title: 'Erro na sincronização',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive' as const,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' as const,
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSyncComplete = async () => {
    try {
      const messages = await fetchMessages(selectedInboxAccount === 'all' ? undefined : selectedInboxAccount);
      setDbMessages(messages || []);
    } catch (error) {
      console.error('Error reloading messages:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Modern Header */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">Mensagens</h1>
              <p className="text-[15px] text-muted-foreground">
                Central de mensagens WhatsApp e Email
              </p>
            </div>
          
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogTrigger asChild>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={async () => {
                    setIsLoadingMessages(true);
                    try {
                      const messages = await fetchMessages(selectedInboxAccount === 'all' ? undefined : selectedInboxAccount);
                      setDbMessages(messages || []);
                      toast({
                        title: 'Mensagens atualizadas',
                        description: `${messages?.length || 0} mensagem(ns) carregada(s).`,
                        variant: 'success' as const,
                      });
                    } catch (error) {
                      toast({
                        title: 'Erro ao atualizar',
                        description: 'Não foi possível carregar as mensagens.',
                        variant: 'destructive' as const,
                      });
                    } finally {
                      setIsLoadingMessages(false);
                    }
                  }}
                  disabled={isLoadingMessages}
                >
                  <Settings className="h-4 w-4" />
                  {isLoadingMessages ? 'Atualizando...' : 'Atualizar'}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Conectar Conta
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Contas Conectadas</DialogTitle>
                <DialogDescription>
                  Gerencie suas contas de WhatsApp e Email conectadas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">WhatsApp</h4>
                  {connectedAccounts.filter(acc => acc.type === 'whatsapp').map(account => (
                    <div key={account.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.identifier}</p>
                        </div>
                        <Badge 
                          className={account.status === 'connected'
                            ? 'bg-green-50 text-green-700 border-0 hover:bg-green-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                            : 'bg-red-50 text-red-700 border-0 hover:bg-red-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                          }
                        >
                          <Circle className={account.status === 'connected' 
                            ? 'h-2 w-2 fill-green-500 text-green-500'
                            : 'h-2 w-2 fill-red-500 text-red-500'
                          } />
                          {account.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(account.id)}
                          className="flex-1 text-destructive hover:text-destructive border-destructive/30"
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 text-foreground" 
                    size="sm"
                    onClick={() => {
                      setShowAccountDialog(false);
                      setShowWhatsAppDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar WhatsApp
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Email</h4>
                  {connectedAccounts.filter(acc => acc.type === 'email').map(account => (
                    <div key={account.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.identifier}</p>
                        </div>
                        <Badge 
                          className={account.status === 'connected'
                            ? 'bg-green-50 text-green-700 border-0 hover:bg-green-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                            : 'bg-red-50 text-red-700 border-0 hover:bg-red-50 font-medium px-3 py-1 flex items-center gap-1.5 w-fit'
                          }
                        >
                          <Circle className={account.status === 'connected' 
                            ? 'h-2 w-2 fill-green-500 text-green-500'
                            : 'h-2 w-2 fill-red-500 text-red-500'
                          } />
                          {account.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncAccount(account)}
                          className="flex-1"
                        >
                          Sincronizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(account.id)}
                          className="flex-1 text-destructive hover:text-destructive border-destructive/30"
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 text-foreground" 
                    size="sm"
                    onClick={() => {
                      setShowAccountDialog(false);
                      setShowEmailDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Email
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
          {/* Sidebar - Message List */}
          <Card className="col-span-4 rounded-xl border shadow-sm overflow-hidden flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  style={{ height: '40px' }}
                />
              </div>
              
              {/* Filter Buttons - 3 per row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Todas - First button */}
                <Button
                  variant={selectedInboxAccount === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedInboxAccount('all')}
                  className={cn(
                    "gap-1.5",
                    selectedInboxAccount === 'all' && "bg-[#141924] hover:bg-[#1a2030] text-white hover:text-white"
                  )}
                >
                  Todas
                </Button>
                
                {/* Account buttons */}
                {connectedAccounts.map(account => (
                  <Button
                    key={account.id}
                    variant={selectedInboxAccount === account.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedInboxAccount(account.id)}
                    className={cn(
                      "gap-1.5",
                      selectedInboxAccount === account.id && "bg-[#141924] hover:bg-[#1a2030] text-white hover:text-white"
                    )}
                  >
                    {account.type === 'whatsapp' ? (
                      <MessageCircle className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {account.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message)}
                  className={cn(
                    "p-4 border-b cursor-pointer transition-colors hover:bg-accent/50",
                    selectedMessage?.id === message.id && "bg-accent/30",
                    !message.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                      message.type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                    )}>
                      {message.type === 'whatsapp' ? (
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Mail className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            !message.read && "font-semibold"
                          )}>
                            {message.sender}
                          </p>
                          {message.subject && (
                            <p className="text-xs text-muted-foreground truncate">
                              {message.subject}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {message.starred && (
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {message.timestamp}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {message.preview}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {!message.read && (
                          <Badge className="bg-green-50 text-green-700 border-0 text-xs flex items-center gap-1.5 w-fit">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            Nova
                          </Badge>
                        )}
                        {selectedInboxAccount === 'all' && (
                          <Badge variant="outline" className="text-xs">
                            {connectedAccounts.find(acc => acc.id === message.receivedOnAccountId)?.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Main Panel - Conversation */}
          <Card className="col-span-8 rounded-xl border shadow-sm overflow-hidden flex flex-col">
            {selectedMessage ? (
              selectedMessage.type === 'email' ? (
                /* ===== EMAIL VIEW (Outlook-style) ===== */
                <EmailView
                  message={selectedMessage}
                  replyAccountName={replyFromAccount?.name}
                  onReply={async (text) => {
                    const account = replyFromAccount || connectedAccounts.find(a => a.type === 'email' && a.config?.password);
                    if (account?.config?.smtp?.server && account?.config?.password) {
                      const result = await sendEmailMessage({
                        accountId: account.id,
                        fromEmail: account.identifier,
                        fromName: account.name,
                        to: selectedMessage.senderEmail || '',
                        subject: `Re: ${selectedMessage.subject || ''}`,
                        text,
                        smtpServer: account.config.smtp.server,
                        smtpPort: account.config.smtp.port || 465,
                        password: account.config.password,
                      });
                      if (result.success) {
                        toast({ title: 'Email enviado!', description: `Enviado para ${selectedMessage.senderEmail}`, variant: 'success' as const });
                      } else {
                        toast({ title: 'Erro ao enviar', description: result.error || 'Erro desconhecido', variant: 'destructive' as const });
                      }
                    } else {
                      toast({ title: 'Conta não configurada', description: 'Configure SMTP e senha para enviar emails.', variant: 'destructive' as const });
                    }
                  }}
                  onStar={() => {}}
                  onDelete={() => {}}
                  onArchive={() => {}}
                />
              ) : (
                /* ===== WHATSAPP VIEW (Chat-style) ===== */
                <>
                  {/* Conversation Header */}
                  <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center bg-green-100">
                        <MessageCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedMessage.sender}</h3>
                        {selectedMessage.senderEmail && (
                          <p className="text-sm text-muted-foreground">{selectedMessage.senderEmail}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        {selectedMessage.starred ? (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/5">
                    {/* Initial received message */}
                    <div className="flex justify-start">
                      <div className="max-w-[70%] bg-card rounded-xl p-4 shadow-sm border">
                        <p className="text-sm">{selectedMessage.preview}</p>
                        <p className="text-xs text-muted-foreground mt-2">{selectedMessage.timestamp}</p>
                      </div>
                    </div>

                    {/* Conversation messages */}
                    {conversationMessages.map((msg) => (
                      <div key={msg.id} className={cn("flex", msg.isSent ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[70%] rounded-xl p-4 shadow-sm",
                          msg.isSent ? "bg-[#141924] text-white" : "bg-card border"
                        )}>
                          <p className="text-sm">{msg.text}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((attachment, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs opacity-80">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{attachment}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className={cn(
                            "text-xs mt-2",
                            msg.isSent ? "opacity-70" : "text-muted-foreground"
                          )}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="border-t bg-muted/10">
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="p-3 border-b bg-muted/5">
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((file, index) => (
                            <div key={index} className="relative group">
                              <div className="flex items-center gap-2 bg-card border rounded-lg p-2 pr-8">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-500" />
                                )}
                                <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => removeAttachment(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="flex-shrink-0 h-10 w-10"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        
                        <div className="flex-1 relative">
                          <textarea
                            ref={textareaRef}
                            placeholder="Digite uma mensagem..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
                            style={{ height: '40px', minHeight: '43px', maxHeight: '120px' }}
                          />
                        </div>

                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="flex-shrink-0 h-10 w-10"
                            >
                              <Smile className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 border-0" align="end">
                            <EmojiPicker
                              onEmojiClick={handleEmojiClick}
                              width={350}
                              height={400}
                            />
                          </PopoverContent>
                        </Popover>

                        <Button 
                          className="flex-shrink-0 gap-2 bg-[#141924] hover:bg-[#1a2030] text-white h-10 px-4" 
                          onClick={handleSendMessage}
                          disabled={!messageText.trim() && attachments.length === 0}
                        >
                          <Send className="h-4 w-4" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Selecione uma mensagem</p>
                  <p className="text-sm mt-1">Escolha uma conversa para começar</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Connection Dialogs */}
      <ConnectWhatsAppDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
        onAccountConnected={handleAccountConnected}
      />
      <ConnectEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onAccountConnected={handleAccountConnected}
      />
      <EditAccountDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        account={editingAccount}
        onAccountUpdated={handleAccountUpdated}
      />
      <SyncEmailDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        accountId={syncingAccount?.id || ''}
        accountName={syncingAccount?.name || ''}
        accountEmail={syncingAccount?.identifier || ''}
        imapServer={syncingAccount?.config?.imap?.server || 'imap.gmail.com'}
        imapPort={syncingAccount?.config?.imap?.port || 993}
        storedPassword={syncingAccount?.config?.password}
        onSyncComplete={handleSyncComplete}
      />
    </DashboardLayout>
  );
}
