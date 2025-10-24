import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Clock, 
  Building2, 
  FileText,
  Send,
  AlertCircle,
  Download,
  File,
  CheckCircle,
  Paperclip
} from 'lucide-react';
import { FileUpload } from '@/components/tickets/FileUpload';
import { TicketReviewModal } from '@/components/tickets/TicketReviewModal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { normalizeTicketStatus, getStatusUpdateData } from '@/lib/tickets';

export default function ClientTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const [newMessageHtml, setNewMessageHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      fetchMessages();
      fetchAttachments();
      markAsViewed();
    }
  }, [id, user]);

  const markAsViewed = async () => {
    if (!id || !user?.id) return;
    
    try {
      // Inserir ou atualizar a visualização do ticket
      await supabase
        .from('ticket_views')
        .upsert({
          ticket_id: id,
          user_id: user.id,
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,user_id'
        });

      // Marcar notificações relacionadas como lidas
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('reference_type', 'ticket')
        .eq('reference_id', id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking ticket as viewed:', error);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      // Resolver client_id: se for contato, pegar do vínculo; senão, do cliente dono
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      let resolvedClientId: string | null = null;
      let userIsContact = false;

      if (contactData?.client_id) {
        userIsContact = true;
        setIsContact(true);
        resolvedClientId = contactData.client_id;
      } else {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();
        resolvedClientId = clientData?.id || null;
      }

      if (!resolvedClientId) {
        // Tentar associar automaticamente o usuário ao cliente pelo e-mail
        try {
          await supabase.functions.invoke('link-client-user');
          const { data: clientAfterLink } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user?.id)
            .maybeSingle();
          resolvedClientId = clientAfterLink?.id || null;
        } catch (e) {
          console.error('Auto-link client failed', e);
        }

        if (!resolvedClientId) {
          toast({
            title: 'Acesso negado',
            description: 'Você não está associado a nenhum cliente.',
            variant: 'destructive',
          });
          navigate('/portal/tickets');
          return;
        }
      }

      let query = supabase
        .from('tickets')
        .select(`
          *,
          departments (
            id,
            name,
            color
          )
        `)
        .eq('id', id)
        .eq('client_id', resolvedClientId);

      if (userIsContact) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      // Check if ticket was created by a contact
      const { data: creatorContactData } = await supabase
        .from('client_contacts')
        .select('id, name, email')
        .eq('user_id', data.created_by)
        .maybeSingle();

      setTicket({ ...data, contact_creator: creatorContactData });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar ticket',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/portal/tickets');
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

      // Buscar roles de todos os usuários
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Buscar contatos
      const { data: contactsData } = await supabase
        .from('client_contacts')
        .select('user_id, name')
        .in('user_id', userIds);

      // Buscar cliente para pegar apelido
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id, nickname, full_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Buscar anexos das mensagens
      const messageIds = messagesData.map(m => m.id);
      const { data: attachmentsData } = await supabase
        .from('ticket_attachments')
        .select('message_id, id, file_name')
        .in('message_id', messageIds);

      const currentProfile = profilesData?.find(p => p.id === user?.id);

      const messagesWithProfiles = messagesData.map(message => {
        const profile = profilesData?.find(p => p.id === message.user_id);
        const isCurrentUser = message.user_id === user?.id;
        const userRole = rolesData?.find(r => r.user_id === message.user_id)?.role;
        const isContact = contactsData?.some(c => c.user_id === message.user_id);
        const isAdmin = userRole === 'admin';
        const messageAttachments = attachmentsData?.filter(a => a.message_id === message.id) || [];
        
        let displayName = 'Usuário';
        let messageType: 'admin' | 'client' | 'contact' = 'client';
        
        if (isAdmin) {
          displayName = profile?.full_name || 'Suporte';
          messageType = 'admin';
        } else if (isContact) {
          const contact = contactsData?.find(c => c.user_id === message.user_id);
          displayName = contact?.name || profile?.full_name || 'Contato';
          messageType = 'contact';
        } else {
          displayName = clientData?.nickname || clientData?.full_name || currentProfile?.full_name || 'Cliente';
          messageType = 'client';
        }
        
        return {
          ...message,
          profiles: profile || null,
          isAdmin,
          isContact,
          messageType,
          displayName,
          attachmentNames: messageAttachments.map(a => a.file_name).join(', ') || ''
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
    const plain = stripHtml(newMessageHtml).trim();
    if (!plain || !id) return;

    // Impedir envio se ticket estiver fechado ou resolvido
    if (ticket?.status === 'closed' || ticket?.status === 'resolved') {
      toast({
        title: 'Ticket fechado',
        description: 'Não é possível enviar mensagens em um ticket fechado.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const sanitized = DOMPurify.sanitize(newMessageHtml, { USE_PROFILES: { html: true } });
      const { data: messageData, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          message: sanitized,
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
      
      // Send WhatsApp notification to admin
      try {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            action: 'send_ticket_notification',
            ticket_id: id,
            message_id: messageData.id,
            event_type: 'ticket_message',
          },
        });
      } catch (err) {
        console.error('Error sending WhatsApp notification:', err);
      }
      
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

  // Helpers
  const stripHtml = (html: string) => DOMPurify.sanitize(html || '', { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '');

  const quoteMessage = (msg: any) => {
    const author = msg.displayName || 'Usuário';
    const time = format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const sanitizedMsg = DOMPurify.sanitize(msg.message || '');
    const quoteHtml = `<blockquote><strong>${author}</strong> em ${time}<div>${sanitizedMsg}</div></blockquote><p><br/></p>`;
    setNewMessageHtml((prev) => `${prev}${quoteHtml}`);
  };

  const handleReviewSubmit = async (rating: number, feedback: string) => {
    try {
      const { updateTicketStatus } = await import('@/lib/updateTicketStatus');
      await updateTicketStatus(id as string, 'closed');

      // Atualização otimista do estado local para UI imediata
      setTicket(prev => prev ? {
        ...prev,
        status: 'closed',
        closed_at: new Date().toISOString()
      } : prev);

      // Sincronizar com o backend
      fetchTicketDetails();
      
      toast({
        title: 'Ticket fechado',
        description: 'Obrigado pela sua avaliação!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao fechar ticket',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      waiting: 'Aguardando',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-status-open';
      case 'in_progress':
        return 'badge-status-in-progress';
      case 'waiting':
        return 'badge-status-waiting';
      case 'resolved':
        return 'badge-status-resolved';
      case 'closed':
        return 'badge-status-closed';
      default:
        return 'badge-status-open';
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
          <Button onClick={() => navigate('/portal/tickets')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Tickets
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const canResolve = ticket.status !== 'closed' && ticket.status !== 'resolved';

  return (
    <DashboardLayout breadcrumbLabel={`Ticket #${ticket.ticket_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal/tickets')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
            <p className="text-muted-foreground">{ticket.subject}</p>
          </div>
          {canResolve && (
            <Button onClick={() => setShowReviewModal(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Problema Resolvido
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Creator Info - Hidden for contacts */}
            {!isContact && ticket.contact_creator && (
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

            {/* Alerta de ticket fechado */}
            {ticket.status === 'closed' && (
              <div className="bg-muted border border-border rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">Ticket Fechado</p>
                  <p className="text-sm text-muted-foreground">
                    Este ticket foi fechado e não permite mais o envio de mensagens.
                  </p>
                </div>
              </div>
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
                       
                       const badgeClasses =
                         message.messageType === 'admin'
                           ? 'bg-gray-600 text-white'
                           : message.messageType === 'contact'
                           ? 'bg-green-600 text-white'
                           : 'bg-blue-600 text-white';
                       
                       return (
                         <Card key={message.id} className={colorClasses}>
                           <CardContent className="p-4">
                             <div className="flex items-start gap-3">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <span className={`font-semibold text-sm ${textColor}`}>
                                     {message.displayName}
                                     {message.isAdmin && (
                                       <span className={`ml-2 text-xs px-2 py-0.5 rounded ${badgeClasses}`}>
                                         Suporte
                                       </span>
                                     )}
                                     {message.isContact && !message.isAdmin && (
                                       <span className={`ml-2 text-xs px-2 py-0.5 rounded ${badgeClasses}`}>
                                         Contato
                                       </span>
                                     )}
                                   </span>
                                   <span className="text-xs text-muted-foreground">
                                     {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                   </span>
                                 {message.attachmentNames && (
                                   <TooltipProvider>
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <span>
                                           <Paperclip className="h-3 w-3 text-muted-foreground" />
                                         </span>
                                       </TooltipTrigger>
                                       <TooltipContent>
                                         <p className="text-xs">{message.attachmentNames}</p>
                                       </TooltipContent>
                                     </Tooltip>
                                   </TooltipProvider>
                                 )}
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => quoteMessage(message)}
                                   className="ml-auto h-6 text-xs"
                                 >
                                   Citar
                                 </Button>
                               </div>
                               <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.message || '') }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                       );
                     })}
                   </div>
                 )}

                {/* New Message */}
                {canResolve && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="min-h-[250px]">
                      <ReactQuill
                        theme="snow"
                        value={newMessageHtml}
                        onChange={setNewMessageHtml}
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
                      disabled={!stripHtml(newMessageHtml).trim() || sending}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
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

            {/* Department Info */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: ticket.departments?.color || '#1E40AF',
                    color: ticket.departments?.color || '#1E40AF',
                  }}
                >
                  {ticket.departments?.name || 'N/A'}
                </Badge>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridade</p>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">
                    {format(new Date(ticket.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {ticket.resolved_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolvido em</p>
                    <p className="font-medium">
                      {format(new Date(ticket.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {ticket.closed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fechado em</p>
                    <p className="font-medium">
                      {format(new Date(ticket.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TicketReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        onSubmit={handleReviewSubmit}
      />
    </DashboardLayout>
  );
}
