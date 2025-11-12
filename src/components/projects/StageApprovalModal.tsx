import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { CheckCircle, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface StageApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageName: string;
  onSuccess?: () => void;
}

export function StageApprovalModal({
  open,
  onOpenChange,
  stageId,
  stageName,
  onSuccess,
}: StageApprovalModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  const [notes, setNotes] = useState('');
  const [approvalToken, setApprovalToken] = useState<string | null>(null);

  const createApprovalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_approvals')
        .insert({
          project_stage_id: stageId,
          requested_by: user?.id,
          notes: notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stage-approvals', stageId] });
      setApprovalToken(data.approval_token);
      setTimeout(() => fireConfetti({ particleCount: 80, spread: 60 }), 300);
      toast({
        title: 'Solicitação criada',
        description: 'Link de aprovação gerado com sucesso.',
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error creating approval:', error);
      toast({
        title: 'Erro ao criar solicitação',
        description: 'Não foi possível gerar o link de aprovação.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = () => {
    if (approvalToken) {
      const url = `${window.location.origin}/approval/${approvalToken}`;
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado',
        description: 'O link foi copiado para a área de transferência.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApprovalMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Aprovação do Cliente</DialogTitle>
          <DialogDescription>
            Gere um link único para o cliente aprovar a etapa "{stageName}"
          </DialogDescription>
        </DialogHeader>

        {!approvalToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione instruções ou informações para o cliente..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createApprovalMutation.isPending}>
                {createApprovalMutation.isPending ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Link gerado com sucesso!</span>
            </div>

            <div className="space-y-2">
              <Label>Link de Aprovação</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/approval/${approvalToken}`}
                  className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link para o cliente. Ele poderá aprovar, rejeitar ou solicitar
                mudanças sem precisar fazer login.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}