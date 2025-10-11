import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  File
} from 'lucide-react';
import { FileUpload } from '@/components/tickets/FileUpload';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchMessages();
      fetchAttachments();
      markTicketAsViewed();
      markNotificationsAsRead();
    }
  }, [id]);

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

      // Marcar como lidas todas as notificações relacionadas a este ticket
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

      // Check if ticket was created by a contact
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
      // Buscar mensagens
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

      // Buscar perfis dos usuários
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Buscar roles dos usuários
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Buscar contatos
      const { data: contactsData } = await supabase
        .from('client_contacts')
        .select('user_id, name')
        .in('user_id', userIds);

      // Combinar mensagens com perfis
      const messagesWithProfiles = messagesData.map(message => {
        const profile = profilesData?.find(p => p.id === message.user_id) || null;
        const userRole = rolesData?.find(r => r.user_id === message.user_id)?.role;
        const isContact = contactsData?.some(c => c.user_id === message.user_id);
        const isAdmin = userRole === 'admin';
        
        let messageType: 'admin' | 'client' | 'contact' = 'client';
        
        if (isAdmin) {
          messageType = 'admin';
        } else if (isContact) {
          messageType = 'contact';
        }
        
        return {
          ...message,
          profiles: profile,
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
    if (!newMessage.trim() || !id) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: messageData, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          user_id: user.id,
          message: newMessage,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (messageAttachments.length > 0) {
        await uploadMessageAttachments(messageData.id, messageAttachments);
      }

      setNewMessage('');
      setMessageAttachments([]);
      fetchMessages();
      fetchAttachments();
      
      // Send email notification
      supabase.functions.invoke('send-email', {
        body: {
          template_key: 'ticket_message_added',
          ticket_id: id,
        },
      }).catch(err => console.error('Error sending email:', err));
      
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus as 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' })
        .eq('id', id);

      if (error) throw error;

      fetchTicketDetails();
      
      // Send email notification
      supabase.functions.invoke('send-email', {
        body: {
          template_key: 'ticket_status_changed',
          ticket_id: id,
        },
      }).catch(err => console.error('Error sending email:', err));
      
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
          <div>
            <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
            <p className="text-muted-foreground">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Creator Info */}
            {ticket.contact_creator && (
              <Card className="card-elevated border-blue-500/50 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <User className="h-4 w-4" />
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
                      
                      const badgeClasses =
                        message.messageType === 'admin'
                          ? 'bg-gray-600'
                          : message.messageType === 'contact'
                          ? 'bg-green-600'
                          : 'bg-blue-600';
                      
                      return (
                        <Card key={message.id} className={colorClasses}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`font-semibold text-sm ${textColor}`}>
                                    {message.profiles?.full_name || 'Usuário'}
                                    {message.isAdmin && (
                                      <span className={`ml-2 text-xs text-white px-2 py-0.5 rounded ${badgeClasses}`}>
                                        Admin
                                      </span>
                                    )}
                                    {message.isContact && !message.isAdmin && (
                                      <span className={`ml-2 text-xs text-white px-2 py-0.5 rounded ${badgeClasses}`}>
                                        Contato
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.message}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* New Message */}
                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="Escreva sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <FileUpload
                    onFilesChange={setMessageAttachments}
                    maxSizeMB={1}
                    multiple={true}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
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
            {/* Status and Priority */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Status e Prioridade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {getStatusLabel(ticket.status)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{getStatusLabel('open')}</SelectItem>
                      <SelectItem value="in_progress">{getStatusLabel('in_progress')}</SelectItem>
                      <SelectItem value="waiting">{getStatusLabel('waiting')}</SelectItem>
                      <SelectItem value="resolved">{getStatusLabel('resolved')}</SelectItem>
                      <SelectItem value="closed">{getStatusLabel('closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Prioridade</p>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {getPriorityLabel(ticket.priority)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{getPriorityLabel('low')}</SelectItem>
                      <SelectItem value="medium">{getPriorityLabel('medium')}</SelectItem>
                      <SelectItem value="high">{getPriorityLabel('high')}</SelectItem>
                      <SelectItem value="urgent">{getPriorityLabel('urgent')}</SelectItem>
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
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">
                    {ticket.clients?.full_name || ticket.clients?.company_name || 'N/A'}
                  </p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
