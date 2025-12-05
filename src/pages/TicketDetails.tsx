import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Building2, 
  FileText,
  Send,
  AlertCircle,
  Download,
  File,
  Eye
} from 'lucide-react';
import { FileUpload } from '@/components/tickets/FileUpload';
import { TicketSLABadge } from '@/components/tickets/TicketSLABadge';
import { MacroSelector } from '@/components/tickets/MacroSelector';
import { TypingIndicator } from '@/components/tickets/TypingIndicator';
import { EmojiPicker } from '@/components/shared/EmojiPicker';
import { AttachmentPreviewModal } from '@/components/tickets/AttachmentPreviewModal';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { useConfetti } from '@/hooks/useConfetti';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const [newMessageHtml, setNewMessageHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [slaTracking, setSlaTracking] = useState<any>(null);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { typingUsers, setTyping } = useTypingStatus(id || '', currentUser?.id);
  const { fireMultipleConfetti } = useConfetti();

  const canPreviewFile = (fileType: string) => {
    return fileType.startsWith('image/') || 
           fileType === 'application/pdf' || 
           fileType.startsWith('video/') || 
           fileType.startsWith('audio/');
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setCurrentUser({ id: user.id, name: profile?.full_name || 'Usuário' });
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchMessages();
      fetchAttachments();
      fetchSLATracking();
      markTicketAsViewed();
      markNotificationsAsRead();
    }
  }, [id]);

  const fetchSLATracking = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_sla_tracking')
        .select('*')
        .eq('ticket_id', id)
        .maybeSingle();

      if (error) throw error;
      setSlaTracking(data);
    } catch (error: any) {
      console.error('Error fetching SLA tracking:', error);
    }
  };

  const markTicketAsViewed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('ticket_views')
        .upsert({
          ticket_id: id,
          user_id: user.id,
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,user_id'
        });
    } catch (error) {
      console.error('Error marking ticket as viewed:', error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('reference_type', 'ticket')
        .eq('reference_id', id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            responsible_name,
            nickname,
            client_type,
            email,
            phone,
            cpf_cnpj
          ),
          departments (
            id,
            name,
            color
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('id, name, email')
        .eq('user_id', data.created_by)
        .maybeSingle();

      setTicket({ ...data, contact_creator: contactData });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar ticket',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const { data: contactsData } = await supabase
        .from('client_contacts')
        .select('user_id, name')
        .in('user_id', userIds);

      const { data: clientsData } = await supabase
        .from('clients')
        .select('user_id, nickname, full_name, company_name')
        .in('user_id', userIds);

      const messagesWithProfiles = messagesData.map(message => {
        const profile = profilesData?.find(p => p.id === message.user_id) || null;
        const userRole = rolesData?.find(r => r.user_id === message.user_id)?.role;
        const contact = contactsData?.find(c => c.user_id === message.user_id);
        const client = clientsData?.find(c => c.user_id === message.user_id);
        const isContact = !!contact;
        const isAdmin = userRole === 'admin';
        
        let messageType: 'admin' | 'client' | 'contact' = 'client';
        let displayName = 'Usuário';
        
        if (isAdmin) {
          messageType = 'admin';
          displayName = profile?.full_name || 'Suporte';
        } else if (isContact) {
          messageType = 'contact';
          displayName = contact.name || profile?.full_name || 'Contato';
        } else if (client) {
          messageType = 'client';
          displayName = client.nickname || profile?.full_name || 'Cliente';
        } else {
          messageType = 'admin';
          displayName = profile?.full_name || 'Usuário';
        }
        
        return {
          ...message,
          profiles: profile,
          displayName,
          messageType,
          isAdmin,
          isContact
        };
      });

      setMessages(messagesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleSendMessage = async () => {
    const plainText = DOMPurify.sanitize(newMessageHtml, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim();
    if (!plainText && messageAttachments.length === 0 || !id) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = rolesData?.role === 'admin';

      const sanitizedMessage = DOMPurify.sanitize(newMessageHtml, { USE_PROFILES: { html: true } });

      const { data: messageData, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          user_id: user.id,
          message: sanitizedMessage,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (messageAttachments.length > 0) {
        await uploadMessageAttachments(messageData.id, messageAttachments);
      }

      setNewMessageHtml('');
      setMessageAttachments([]);
      fetchMessages();
      fetchAttachments();
      
      // Envio antigo de WhatsApp removido (centralizado via send-notification)
      // if (isAdmin) {
      //   supabase.functions.invoke('send-whatsapp', {
      //     body: {
      //       action: 'send_ticket_notification',
      //       ticket_id: id,
      //       message_id: messageData.id,
      //       event_type: 'admin_response',
      //     },
      //   }).catch(err => console.error('Error sending WhatsApp:', err));
      // }
      
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi adicionada ao ticket.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const uploadMessageAttachments = async (messageId: string, files: File[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        await supabase.from('ticket_attachments').insert({
          ticket_id: id,
          message_id: messageId,
          file_name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast({
        title: 'Erro ao enviar anexos',
        description: 'Alguns arquivos não puderam ser enviados.',
        variant: 'destructive',
      });
    }
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .download(attachment.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Erro ao baixar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' })
        .eq('id', id);

      if (error) throw error;

      fetchTicketDetails();
      toast({
        title: 'Prioridade atualizada',
        description: 'A prioridade do ticket foi alterada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar prioridade',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus as any })
        .eq('id', id);

      if (error) throw error;

      // Adicionar mensagem do sistema sobre mudança de status
      const statusLabels: Record<string, string> = {
        waiting: 'Aguardando',
        in_progress: 'Em Atendimento',
        resolved: 'Resolvido',
        closed: 'Concluído',
      };

      await supabase.from('ticket_messages').insert({
        ticket_id: id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        message: `<em>Status do ticket alterado para: <strong>${statusLabels[newStatus]}</strong></em>`,
        is_internal: false,
      });

      fetchTicketDetails();
      fetchMessages();
      
      // Dispara confetti ao concluir ou resolver ticket
      if (newStatus === 'closed' || newStatus === 'resolved') {
        setTimeout(() => fireMultipleConfetti(), 300);
      }
      
      toast({
        title: 'Status atualizado',
        description: 'O status do ticket foi alterado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'badge-priority-urgent';
      case 'high':
        return 'badge-priority-high';
      case 'medium':
        return 'badge-priority-medium';
      case 'low':
        return 'badge-priority-low';
      default:
        return 'badge-priority-medium';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ticket não encontrado</h2>
          <Button onClick={() => navigate('/tickets')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Tickets
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabel={`Ticket #${ticket.ticket_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tickets')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
              <TicketSLABadge slaTracking={slaTracking} status={ticket.status} />
            </div>
            <p className="text-muted-foreground mt-1">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {ticket.contact_creator && (
              <Card className="card-elevated border-blue-500/50 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Criado por: {ticket.contact_creator.name} ({ticket.contact_creator.email})
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Descrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const colorClasses = 
                        message.messageType === 'admin' 
                          ? 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-900'
                          : message.messageType === 'contact'
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
                      
                      const textColor = 
                        message.messageType === 'admin'
                          ? 'text-gray-700 dark:text-gray-400'
                          : message.messageType === 'contact'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-blue-700 dark:text-blue-400';
                      
                      return (
                        <Card key={message.id} className={`${colorClasses} border`}>
                          <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-semibold ${textColor}`}>
                                        {message.displayName}
                                      </span>
                                      <span className={`text-xs font-medium ${textColor}`}>
                                        {message.messageType === 'admin' && '• Suporte'}
                                        {message.messageType === 'contact' && '• Colaborador'}
                                        {message.messageType === 'client' && '• Cliente'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {message.profiles?.email || 'Email não disponível'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.message || '') }}
                                />
                              </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <TypingIndicator userName={typingUsers[0].userName} />
                )}

                {/* New Message */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <MacroSelector 
                      onSelectMacro={(content) => setNewMessageHtml(content)} 
                      departmentId={ticket.department_id}
                    />
                    <EmojiPicker 
                      onEmojiSelect={(emoji) => setNewMessageHtml(newMessageHtml + emoji)}
                    />
                  </div>
                  <div className="min-h-[250px]">
                    <ReactQuill
                      theme="snow"
                      value={newMessageHtml}
                      onChange={(content) => {
                        setNewMessageHtml(content);
                        const hasText = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim().length > 0;
                        setTyping(hasText, currentUser?.name);
                      }}
                      placeholder="Escreva sua mensagem..."
                      style={{ height: '200px' }}
                    />
                  </div>
                  <FileUpload
                    onFilesChange={setMessageAttachments}
                    maxSizeMB={1}
                    multiple={true}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(DOMPurify.sanitize(newMessageHtml, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim().length === 0 && messageAttachments.length === 0) || sending}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Priority */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waiting">Aguardando</SelectItem>
                      <SelectItem value="in_progress">Em Atendimento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {getPriorityLabel(ticket.priority)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {ticket.client_id ? 'Cliente' : 'Solicitante'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.client_id ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Identificação</p>
                      {ticket.clients?.client_type === 'person' ? (
                        <div>
                          <p className="font-semibold">{ticket.clients?.responsible_name || ticket.clients?.nickname || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{ticket.clients?.full_name || 'N/A'}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">{ticket.clients?.responsible_name || ticket.clients?.nickname || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{ticket.clients?.company_name || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    {ticket.clients?.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{ticket.clients.email}</p>
                      </div>
                    )}
                    {ticket.clients?.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-medium">{ticket.clients.phone}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                        Não vinculado
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-semibold">{ticket.requester_name || 'Não informado'}</p>
                    </div>
                    {ticket.requester_email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{ticket.requester_email}</p>
                      </div>
                    )}
                    {ticket.requester_phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-medium">{ticket.requester_phone}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {attachments.length > 0 && (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    Anexos ({attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                    >
                      <button
                        onClick={() => {
                          setPreviewAttachment(attachment);
                          setPreviewOpen(true);
                        }}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                            {canPreviewFile(attachment.file_type) && (
                              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                                <Eye className="h-3 w-3" />
                                Preview disponível
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadAttachment(attachment)}
                        className="flex-shrink-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Department */}
            {ticket.departments && (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: ticket.departments.color,
                      color: ticket.departments.color,
                    }}
                  >
                    {ticket.departments.name}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AttachmentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        attachment={previewAttachment}
        onDownload={() => previewAttachment && downloadAttachment(previewAttachment)}
      />
    </DashboardLayout>
  );
}
