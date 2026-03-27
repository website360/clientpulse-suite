import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Card as CardRow } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingApproval {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  action_data: any;
  status: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requester: {
    full_name: string;
    email: string;
  } | null;
}

export function ApprovalsTab() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();
    
    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('pending_approvals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals'
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchApprovals = async () => {
    try {
      const { data: approvalsData, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Buscar profiles dos solicitantes
      const userIds = [...new Set(approvalsData?.map(a => a.user_id))] as string[];
      
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        profilesData = data || [];
      }

      // Combinar dados
      const approvalsWithProfiles = (approvalsData || []).map(approval => ({
        ...approval,
        requester: profilesData.find(p => p.id === approval.user_id) || null
      }));

      setApprovals(approvalsWithProfiles as PendingApproval[]);
    } catch (error: any) {
      console.error('Error fetching approvals:', error);
      toast({
        title: 'Erro ao carregar aprovações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setReviewNotes('');
    setReviewModal(true);
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedApproval) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('pending_approvals')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      toast({
        title: approved ? 'Solicitação aprovada' : 'Solicitação rejeitada',
        description: `A solicitação foi ${approved ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      setReviewModal(false);
      fetchApprovals();
    } catch (error: any) {
      toast({
        title: 'Erro ao processar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitada
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Aprovações Pendentes
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Gerencie solicitações que requerem aprovação antes de serem executadas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando aprovações...</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
                <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data</span></div>
                <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Usuário</span></div>
                <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ação</span></div>
                <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tabela</span></div>
                <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
                <div className="col-span-2 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
              </div>
              {approvals.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border">
                  <p className="text-[13px] text-muted-foreground">Nenhuma aprovação pendente</p>
                </div>
              ) : (
                approvals.map((approval, index) => (
                  <CardRow key={approval.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 20}ms` }}>
                    <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                      <div className="col-span-2">
                        <p className="text-[13px] font-mono text-muted-foreground">{format(new Date(approval.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-[14px] font-medium text-foreground truncate">{approval.requester?.full_name || 'Usuário'}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{approval.requester?.email || '-'}</p>
                      </div>
                      <div className="col-span-2"><Badge variant="outline">{approval.action}</Badge></div>
                      <div className="col-span-2"><p className="text-[13px] font-mono text-muted-foreground">{approval.table_name}</p></div>
                      <div className="col-span-1">{getStatusBadge(approval.status)}</div>
                      <div className="col-span-2 flex justify-end">
                        {approval.status === 'pending' ? (
                          <Button variant="outline" size="sm" onClick={() => openReviewModal(approval)}>
                            <Eye className="h-4 w-4 mr-2" />Revisar
                          </Button>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">
                            {approval.reviewed_at && format(new Date(approval.reviewed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardRow>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Revisão */}
      <Dialog open={reviewModal} onOpenChange={setReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Solicitação</DialogTitle>
            <DialogDescription>
              Analise e aprove ou rejeite esta solicitação
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solicitante:</span>
                  <span className="font-medium">
                    {selectedApproval.requester?.full_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ação:</span>
                  <Badge variant="outline">{selectedApproval.action}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tabela:</span>
                  <span className="font-mono">{selectedApproval.table_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data:</span>
                  <span>
                    {format(new Date(selectedApproval.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas da Revisão (opcional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Adicione comentários sobre sua decisão..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview(false)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={() => handleReview(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}