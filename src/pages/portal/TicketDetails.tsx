import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Paperclip
} from 'lucide-react';
import { FileUpload } from '@/components/tickets/FileUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

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
      await supabase
        .from('ticket_views')
        .upsert({
          ticket_id: id,
          user_id: user.id,
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,user_id'
        });

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

        if (clientData?.id) {
          resolvedClientId = clientData.id;
        }
      }

      if (!resolvedClientId) {
        throw new Error('Cliente não encontrado');
      }

      const { data, error } = await supabase
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
        .eq('client_id', resolvedClientId)
        .single();

      if (error) throw error;

      const { data: contactCreatorData } = await supabase
        .from('client_contacts')
        .select('id, name, email')
        .eq('user_id', data.created_by)
        .maybeSingle();

      setTicket({ ...data, contact_creator: contactCreatorData });
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
        const contact = contactsData?.find(c => c.user_id === message.user_id);
        const client = clientsData?.find(c => c.user_id === message.user_id);
        const isContact = !!contact;
        const isAdmin = userRole === 'admin';
        const messageAttachments = attachmentsData?.filter(a => a.message_id === message.id) || [];
        
        let displayName = 'Usuário';
        let messageType: 'admin' | 'client' | 'contact' = 'client';
        
        if (isAdmin) {
          displayName = profile?.full_name || 'Suporte';
          messageType = 'admin';
        } else if (isContact) {
          displayName = contact?.name || profile?.full_name || 'Contato';
          messageType = 'contact';
        } else {
          displayName = client?.nickname || profile?.full_name || 'Cliente';
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
    const plain = DOMPurify.sanitize(newMessageHtml, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim();
    if (!plain || !id) return;

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

  const stripHtml = (html: string) => DOMPurify.sanitize(html || '', { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: 'Aguardando',
      in_progress: 'Em Atendimento',
      resolved: 'Resolvido',
      closed: 'Concluído',
    };
    return labels[status] || status;
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
            Voltar para Meus Tickets
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
            onClick={() => navigate('/portal/tickets')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
            <p className="text-muted-foreground">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                                    <span className={`text-sm font-semibold ${textColor}`}>
                                      {message.displayName}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{message.profiles?.email || 'Email não disponível'}</span>
                                      <span>•</span>
                                      <span className={textColor}>
                                        {message.messageType === 'admin' && 'Suporte'}
                                        {message.messageType === 'contact' && 'Colaborador'}
                                        {message.messageType === 'client' && 'Cliente'}
                                      </span>
                                    </div>
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

                {/* New Message */}
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
                <CardTitle>Status e Prioridade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Prioridade</p>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
