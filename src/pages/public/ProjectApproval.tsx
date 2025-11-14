import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, MessageSquare, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectApproval() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const { data: approval, isLoading } = useQuery({
    queryKey: ['approval', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_approvals')
        .select(`
          *,
          project_stages (
            name,
            description,
            projects (
              name,
              clients (
                full_name,
                company_name
              )
            )
          )
        `)
        .eq('approval_token', token)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: attachments } = useQuery({
    queryKey: ['stage-attachments', approval?.project_stage_id],
    enabled: !!approval?.project_stage_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_attachments')
        .select('*')
        .eq('project_stage_id', approval.project_stage_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: changes } = useQuery({
    queryKey: ['approval-changes', approval?.id],
    enabled: !!approval?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_approval_changes')
        .select('*')
        .eq('approval_id', approval.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({
      status,
      signature,
    }: {
      status: string;
      signature?: string;
    }) => {
      if (!approverName || !approverEmail) {
        throw new Error('Nome e email são obrigatórios');
      }

      const { error } = await supabase
        .from('project_stage_approvals')
        .update({
          status,
          approved_by_name: approverName,
          approved_by_email: approverEmail,
          approved_at: new Date().toISOString(),
          signature_data: signature || null,
          client_message: clientMessage || null,
        })
        .eq('approval_token', token);
      
      if (error) throw error;

      // Se for solicitação de mudanças, criar registro
      if (status === 'changes_requested' && changeDescription) {
        await supabase
          .from('project_approval_changes')
          .insert({
            approval_id: approval?.id,
            change_description: changeDescription,
          });
      }

      // Se foi aprovado, enviar notificação de confirmação
      if (status === 'approved' && approval) {
        const stage = approval.project_stages as any;
        const project = stage?.projects as any;
        const client = project?.clients as any;

        try {
          await supabase.rpc('notify_event', {
            p_event_type: 'project_approval_confirmed',
            p_data: {
              client_name: client?.company_name || client?.full_name || '',
              client_email: client?.email || '',
              client_phone: client?.phone || '',
              project_name: project?.name || '',
              stage_name: stage?.name || '',
              approved_by_name: approverName,
            },
            p_reference_type: 'project',
            p_reference_id: (project as any)?.id || null,
          });
        } catch (notifyError) {
          console.error('Erro ao enviar notificação de confirmação:', notifyError);
          // Não falhar se notificação falhar
        }
      }
    },
    onSuccess: () => {
      // Redirecionar para página de sucesso
      navigate('/approval-success');
    },
  });

  const handleApprove = () => {
    if (!approverName || !approverEmail) {
      alert('Por favor, preencha seu nome e email');
      return;
    }
    
    setShowSignature(true);
  };

  const handleReject = () => {
    if (!approverName || !approverEmail) {
      alert('Por favor, preencha seu nome e email');
      return;
    }
    
    if (confirm('Tem certeza que deseja rejeitar esta etapa?')) {
      updateApprovalMutation.mutate({ status: 'rejected' });
    }
  };

  const handleRequestChanges = () => {
    if (!approverName || !approverEmail) {
      alert('Por favor, preencha seu nome e email');
      return;
    }
    
    if (!changeDescription.trim()) {
      alert('Por favor, descreva as mudanças necessárias');
      return;
    }
    
    updateApprovalMutation.mutate({ status: 'changes_requested' });
  };

  const handleSignatureSubmit = () => {
    if (signatureRef.current?.isEmpty()) {
      alert('Por favor, assine no campo acima');
      return;
    }
    
    const signatureData = signatureRef.current?.toDataURL();
    updateApprovalMutation.mutate({
      status: 'approved',
      signature: signatureData,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de aprovação não existe ou expirou.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (approval.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aprovação já Processada</CardTitle>
            <CardDescription>
              Esta solicitação já foi {approval.status === 'approved' ? 'aprovada' : approval.status === 'rejected' ? 'rejeitada' : 'respondida'} por {approval.approved_by_name} em{' '}
              {approval.approved_at && format(new Date(approval.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stage = approval.project_stages as any;
  const project = stage?.projects as any;
  const client = project?.clients as any;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Aprovação de Etapa do Projeto</CardTitle>
            <CardDescription>
              Projeto: {project?.name} - Etapa: {stage?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações da etapa */}
            {stage?.description && (
              <div>
                <h3 className="font-medium mb-2">Descrição da Etapa</h3>
                <p className="text-sm text-muted-foreground">{stage.description}</p>
              </div>
            )}

            {/* Observações */}
            {approval.notes && (
              <div>
                <h3 className="font-medium mb-2">Observações</h3>
                <p className="text-sm text-muted-foreground">{approval.notes}</p>
              </div>
            )}

            {/* Anexos */}
            {attachments && attachments.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Arquivos Anexos
                </h3>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {attachment.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de mudanças */}
            {changes && changes.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Histórico de Solicitações</h3>
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div key={change.id} className="text-sm border-l-2 border-primary pl-3">
                      <p className="text-muted-foreground">{change.change_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(change.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {change.resolved && ' - ✓ Resolvido'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário de aprovação */}
            {!showSignature ? (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Seu Nome *</Label>
                    <Input
                      id="name"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Seu Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    value={clientMessage}
                    onChange={(e) => setClientMessage(e.target.value)}
                    placeholder="Adicione comentários ou observações..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="changes">Solicitar Mudanças (opcional)</Label>
                  <Textarea
                    id="changes"
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    placeholder="Descreva as mudanças necessárias..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    onClick={handleApprove}
                    className="flex-1"
                    disabled={updateApprovalMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  {changeDescription.trim() && (
                    <Button
                      onClick={handleRequestChanges}
                      variant="outline"
                      className="flex-1"
                      disabled={updateApprovalMutation.isPending}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Solicitar Mudanças
                    </Button>
                  )}
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="flex-1"
                    disabled={updateApprovalMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Assinatura Eletrônica
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-2">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-40 bg-white rounded',
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => signatureRef.current?.clear()}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowSignature(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSignatureSubmit}
                    className="flex-1"
                    disabled={updateApprovalMutation.isPending}
                  >
                    {updateApprovalMutation.isPending ? 'Enviando...' : 'Confirmar Aprovação'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}