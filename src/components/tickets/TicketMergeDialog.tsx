import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitMerge, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TicketMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTicket: any;
  onMerged: () => void;
}

interface CandidateTicket {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  client_id: string | null;
  clients?: { full_name?: string; company_name?: string; nickname?: string } | null;
}

export function TicketMergeDialog({ open, onOpenChange, sourceTicket, onMerged }: TicketMergeDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<CandidateTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CandidateTicket | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(null);
      setCandidates([]);
      return;
    }
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadCandidates = async () => {
    if (!sourceTicket?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select('id, ticket_number, subject, status, client_id, clients(full_name, company_name, nickname)')
        .neq('id', sourceTicket.id)
        .is('merged_into', null)
        .in('status', ['open', 'waiting', 'in_progress', 'resolved'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (sourceTicket.client_id) {
        query = query.eq('client_id', sourceTicket.client_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCandidates(data || []);
    } catch (error: any) {
      console.error('Error loading merge candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const s = search.toLowerCase();
    return candidates.filter(
      (t) =>
        t.ticket_number.toString().includes(s) ||
        t.subject?.toLowerCase().includes(s) ||
        t.clients?.full_name?.toLowerCase().includes(s) ||
        t.clients?.company_name?.toLowerCase().includes(s) ||
        t.clients?.nickname?.toLowerCase().includes(s)
    );
  }, [candidates, search]);

  const handleMerge = async () => {
    if (!selected || !sourceTicket?.id) return;
    setMerging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1) Mover mensagens
      const msgUpdate = await supabase
        .from('ticket_messages')
        .update({ ticket_id: selected.id })
        .eq('ticket_id', sourceTicket.id);
      if (msgUpdate.error) throw msgUpdate.error;

      // 2) Mover anexos
      const attUpdate = await supabase
        .from('ticket_attachments')
        .update({ ticket_id: selected.id })
        .eq('ticket_id', sourceTicket.id);
      if (attUpdate.error) throw attUpdate.error;

      // 3) Adicionar nota interna no ticket destino documentando a mesclagem
      await supabase.from('ticket_messages').insert({
        ticket_id: selected.id,
        user_id: user?.id,
        is_internal: true,
        message: `<em>Ticket #${sourceTicket.ticket_number} mesclado neste atendimento.</em>`,
      });

      // 4) Fechar o ticket origem + marcar merged_into
      const closeRes = await supabase
        .from('tickets')
        .update({ status: 'closed', merged_into: selected.id })
        .eq('id', sourceTicket.id);
      if (closeRes.error) throw closeRes.error;

      toast({
        title: 'Tickets mesclados',
        description: `#${sourceTicket.ticket_number} foi mesclado em #${selected.ticket_number}.`,
      });
      onMerged();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error merging tickets:', error);
      toast({
        title: 'Erro ao mesclar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setMerging(false);
    }
  };

  const clientLabel = (c?: any) => c?.nickname || c?.company_name || c?.full_name || 'Sem cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Mesclar ticket #{sourceTicket?.ticket_number}
          </DialogTitle>
          <DialogDescription>
            Mover as mensagens e anexos deste ticket para outro e fechá-lo.
            {sourceTicket?.client_id && ' Mostrando apenas tickets do mesmo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, assunto ou cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[280px] overflow-auto border rounded-lg divide-y">
            {loading && (
              <p className="text-sm text-muted-foreground p-4 text-center">Carregando tickets...</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">Nenhum ticket compatível encontrado.</p>
            )}
            {filtered.map((t) => {
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 hover:bg-accent transition-colors',
                    active && 'bg-primary/10 hover:bg-primary/10'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>#{t.ticket_number}</span>
                        <span className="truncate">{t.subject}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{clientLabel(t.clients)}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Esta ação move as mensagens e anexos de <strong>#{sourceTicket?.ticket_number}</strong> para <strong>#{selected.ticket_number}</strong>,
                fecha o ticket de origem e registra uma nota interna no destino. Não pode ser desfeito automaticamente.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={!selected || merging}>
            <GitMerge className="h-4 w-4 mr-2" />
            {merging ? 'Mesclando...' : 'Mesclar tickets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
