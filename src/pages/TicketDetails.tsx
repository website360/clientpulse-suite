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
  UserCog,
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
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { useConfetti } from '@/hooks/useConfetti';
import { cn } from '@/lib/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

interface Agent {
  id: string;
  full_name: string;
}

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
  const [agents, setAgents] = useState<Agent[]>([]);
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
    fetchAgents();
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

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles(id, full_name)')
        .eq('role', 'admin');

      if (error) throw error;

      const list = (data || [])
        .map((row: any) => (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles))
        .filter((p: any) => p && p.id)
        .map((p: any) => ({ id: p.id, full_name: p.full_name || 'Atendente' }));

      setAgents(list);
    } catch (error: any) {
      console.error('Error fetching agents:', error);
    }
  };

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

  const messageIsEmpty = DOMPurify.sanitize(newMessageHtml, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim().length === 0;

  const handleSendMessage = async () => {
    if (messageIsEmpty && messageAttachments.length === 0 || !id) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

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
      if (attachment.file_url.startsWith('http')) {
        const response = await fetch(attachment.file_url);
        if (!response.ok) throw new Error('Erro ao baixar arquivo');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
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
      }
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

      const statusLabels: Record<string, string> = {
        open: 'Aberto',
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

  const handleAssigneeChange = async (value: string) => {
    const newAssignee = value === 'unassigned' ? null : value;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: newAssignee })
        .eq('id', id);

      if (error) throw error;

      fetchTicketDetails();
      toast({
        title: 'Atendente atualizado',
        description: newAssignee
          ? `Ticket atribuído a ${agents.find(a => a.id === newAssignee)?.full_name || 'atendente'}.`
          : 'Ticket marcado como não atribuído.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir atendente',
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

  const statusLabels: Record<string, string> = {
    open: 'Aberto',
    waiting: 'Aguardando',
    in_progress: 'Em Atendimento',
    resolved: 'Resolvido',
    closed: 'Concluído',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'waiting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const assignedAgent = agents.find(a => a.id === ticket?.assigned_to);

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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tickets')}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold">Ticket #{ticket.ticket_number}</h1>
              <Badge className={cn('rounded-full', getStatusColor(ticket.status))}>
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
              <TicketSLABadge slaTracking={slaTracking} status={ticket.status} />
            </div>
            <p className="text-muted-foreground mt-1 truncate">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Conversation column */}
          <div className="lg:col-span-2 space-y-5">
            {ticket.contact_creator && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-blue-600 dark:text-blue-400">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Criado por: {ticket.contact_creator.name} ({ticket.contact_creator.email})
                </span>
              </div>
            )}

            <Card className="card-elevated">
              <CardHeader className="border-b py-4">
                <CardTitle className="text-base">Conversa</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="space-y-5">
                  {/* Original request as first bubble */}
                  <div className="flex gap-3">
                    <AvatarInitials
                      name={ticket.clients?.nickname || ticket.clients?.responsible_name || ticket.requester_name || 'Solicitante'}
                      size="sm"
                    />
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {ticket.clients?.nickname || ticket.clients?.responsible_name || ticket.requester_name || 'Solicitante'}
                        </span>
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium border-blue-300 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                          Solicitação
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm whitespace-pre-wrap dark:border-blue-900 dark:bg-blue-950/30">
                        {ticket.description}
                      </div>
                    </div>
                  </div>

                  {messages.map((message) => {
                    const isSupport = message.messageType === 'admin';
                    const bubble =
                      message.messageType === 'admin'
                        ? 'border-primary/20 bg-primary/10 rounded-tr-sm'
                        : message.messageType === 'contact'
                        ? 'border-green-200 bg-green-50 rounded-tl-sm dark:border-green-900 dark:bg-green-950/30'
                        : 'border-blue-200 bg-blue-50 rounded-tl-sm dark:border-blue-900 dark:bg-blue-950/30';
                    const roleLabel =
                      message.messageType === 'admin' ? 'Suporte'
                      : message.messageType === 'contact' ? 'Colaborador'
                      : 'Cliente';

                    return (
                      <div key={message.id} className={cn('flex gap-3', isSupport && 'flex-row-reverse')}>
                        <AvatarInitials name={message.displayName} size="sm" />
                        <div className={cn('flex flex-col max-w-[85%]', isSupport ? 'items-end' : 'items-start')}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">{message.displayName}</span>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{roleLabel}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div
                            className={cn('rounded-2xl border px-4 py-2.5 text-sm break-words', bubble)}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.message || '') }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {typingUsers.length > 0 && (
                    <TypingIndicator userName={typingUsers[0].userName} />
                  )}
                </div>

                {/* Composer */}
                <div className="mt-5 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    <MacroSelector
                      onSelectMacro={(content) => setNewMessageHtml(content)}
                      departmentId={ticket.department_id}
                    />
                    <EmojiPicker
                      onEmojiSelect={(emoji) => setNewMessageHtml(newMessageHtml + emoji)}
                    />
                  </div>
                  <div className="min-h-[230px]">
                    <ReactQuill
                      theme="snow"
                      value={newMessageHtml}
                      onChange={(content) => {
                        setNewMessageHtml(content);
                        const hasText = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] }).replace(/<[^>]*>/g, '').trim().length > 0;
                        setTyping(hasText, currentUser?.name);
                      }}
                      placeholder="Escreva sua resposta ao cliente..."
                      style={{ height: '180px' }}
                    />
                  </div>
                  <FileUpload
                    onFilesChange={setMessageAttachments}
                    maxSizeMB={1}
                    multiple={true}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(messageIsEmpty && messageAttachments.length === 0) || sending}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Enviando...' : 'Enviar Resposta'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Properties sidebar */}
          <div className="space-y-5">
            {/* Properties */}
            <Card className="card-elevated">
              <CardHeader className="py-4">
                <CardTitle className="text-base">Propriedades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="waiting">Aguardando</SelectItem>
                      <SelectItem value="in_progress">Em Atendimento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue>{getPriorityLabel(ticket.priority)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <UserCog className="h-3.5 w-3.5" />
                    Atendente
                  </Label>
                  <Select value={ticket.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Não atribuído" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Não atribuído</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignedAgent && (
                    <div className="flex items-center gap-2 pt-1">
                      <AvatarInitials name={assignedAgent.full_name} size="xs" />
                      <span className="text-xs text-muted-foreground">{assignedAgent.full_name}</span>
                    </div>
                  )}
                </div>
                {ticket.departments && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label>Departamento</Label>
                      <div>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: ticket.departments.color,
                            color: ticket.departments.color,
                          }}
                        >
                          {ticket.departments.name}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Client / Requester */}
            <Card className="card-elevated">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  {ticket.client_id ? 'Cliente' : 'Solicitante'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.client_id ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Identificação</p>
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
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium break-all">{ticket.clients.email}</p>
                      </div>
                    )}
                    {ticket.clients?.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{ticket.clients.phone}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                      Não vinculado
                    </Badge>
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-semibold">{ticket.requester_name || 'Não informado'}</p>
                    </div>
                    {ticket.requester_email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium break-all">{ticket.requester_email}</p>
                      </div>
                    )}
                    {ticket.requester_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{ticket.requester_phone}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {attachments.length > 0 && (
              <Card className="card-elevated">
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <File className="h-4 w-4" />
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
                                Preview
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

            {/* Timeline */}
            <Card className="card-elevated">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-sm font-medium">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {ticket.resolved_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Resolvido em</p>
                    <p className="text-sm font-medium">
                      {format(new Date(ticket.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {ticket.closed_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Concluído em</p>
                    <p className="text-sm font-medium">
                      {format(new Date(ticket.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
