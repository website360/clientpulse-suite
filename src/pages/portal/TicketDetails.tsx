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

export default function ClientTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

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
      // Primeiro, pegar o client_id do usuário
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!clientData) {
        toast({
          title: 'Erro',
          description: 'Cliente não encontrado',
          variant: 'destructive',
        });
        navigate('/portal/tickets');
        return;
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
        .eq('client_id', clientData.id)
        .single();

      if (error) throw error;
      setTicket(data);
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

      // (Removido) Buscar roles dos usuários - usaremos comparação com o usuário logado para diferenciar

      // Buscar cliente para pegar apelido
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id, nickname, full_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Buscar anexos das mensagens com nomes dos arquivos
      const messageIds = messagesData.map(m => m.id);
      const { data: attachmentsData } = await supabase
        .from('ticket_attachments')
        .select('message_id, id, file_name')
        .in('message_id', messageIds);
      const currentProfile = profilesData?.find(p => p.id === user?.id);

      const messagesWithProfiles = messagesData.map(message => {
        const profile = profilesData?.find(p => p.id === message.user_id);
        const isCurrentUser = message.user_id === user?.id;
        const isAdmin = !isCurrentUser; // no portal do cliente, quem não é o próprio usuário é do suporte
        const messageAttachments = attachmentsData?.filter(a => a.message_id === message.id) || [];
        
        let displayName = 'Usuário';
        
        if (isAdmin) {
          // Mensagens de outros (administradores/suporte)
          displayName = profile?.full_name || 'Suporte';
        } else {
          // Mensagens do próprio usuário logado - usar apelido do cliente ou nome do perfil
          displayName = clientData?.nickname || clientData?.full_name || currentProfile?.full_name || 'Você';
        }
        
        return {
          ...message,
          profiles: profile || null,
          isAdmin,
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
    if (!newMessage.trim() || !id) return;

    setSending(true);
    try {
      const { data: messageData, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          message: newMessage,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (messageAttachments.length > 0) {
        await uploadMessageAttachments(messageData.id, messageAttachments);
      }

      setNewMessage('');
      setMessageAttachments([]);
      fetchMessages();
      fetchAttachments();
      
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

  const handleReviewSubmit = async (rating: number, feedback: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

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
                    {messages.map((message) => (
                      <Card 
                        key={message.id} 
                        className={
                          message.isAdmin
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                            : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`font-semibold text-sm ${message.isAdmin ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}`}>
                                  {message.displayName}
                                  {message.isAdmin && (
                                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                      Suporte
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
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {message.message}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* New Message */}
                {canResolve && (
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
