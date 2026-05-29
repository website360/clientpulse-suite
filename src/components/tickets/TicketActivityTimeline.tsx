import { useEffect, useState } from 'react';
import { History, ArrowRight, UserCog, AlertCircle, Building2, Tag, GitMerge, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface TicketActivityTimelineProps {
  ticketId: string;
  refreshKey?: number;
}

interface Entry {
  id: string;
  ticket_id: string;
  user_id: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  waiting: 'Aguardando',
  in_progress: 'Em Atendimento',
  resolved: 'Resolvido',
  closed: 'Concluído',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const fieldIcon = (field: string) => {
  switch (field) {
    case 'status': return <Circle className="h-3.5 w-3.5 text-blue-500" />;
    case 'priority': return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    case 'assigned_to': return <UserCog className="h-3.5 w-3.5 text-purple-500" />;
    case 'department_id': return <Building2 className="h-3.5 w-3.5 text-cyan-500" />;
    case 'tags': return <Tag className="h-3.5 w-3.5 text-emerald-500" />;
    case 'merged_into': return <GitMerge className="h-3.5 w-3.5 text-fuchsia-500" />;
    default: return <History className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export function TicketActivityTimeline({ ticketId, refreshKey }: TicketActivityTimelineProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [tickets, setTickets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, refreshKey]);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_activity_log')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data || []) as Entry[];
      setEntries(list);

      const userIds = new Set<string>();
      const profileIds = new Set<string>();
      const deptIds = new Set<string>();
      const ticketIds = new Set<string>();
      list.forEach((e) => {
        if (e.user_id) userIds.add(e.user_id);
        if (e.field === 'assigned_to') {
          if (e.old_value) profileIds.add(e.old_value);
          if (e.new_value) profileIds.add(e.new_value);
        } else if (e.field === 'department_id') {
          if (e.old_value) deptIds.add(e.old_value);
          if (e.new_value) deptIds.add(e.new_value);
        } else if (e.field === 'merged_into') {
          if (e.old_value) ticketIds.add(e.old_value);
          if (e.new_value) ticketIds.add(e.new_value);
        }
      });

      const allIds = Array.from(new Set([...userIds, ...profileIds]));
      if (allIds.length > 0) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allIds);
        const authorsMap: Record<string, string> = {};
        const profilesMap: Record<string, string> = {};
        prof?.forEach((p: any) => {
          authorsMap[p.id] = p.full_name || 'Usuário';
          profilesMap[p.id] = p.full_name || 'Atendente';
        });
        setAuthors(authorsMap);
        setProfiles(profilesMap);
      }

      if (deptIds.size > 0) {
        const { data: dep } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', Array.from(deptIds));
        const map: Record<string, string> = {};
        dep?.forEach((d: any) => { map[d.id] = d.name; });
        setDepartments(map);
      }

      if (ticketIds.size > 0) {
        const { data: tks } = await supabase
          .from('tickets')
          .select('id, ticket_number')
          .in('id', Array.from(ticketIds));
        const map: Record<string, number> = {};
        tks?.forEach((t: any) => { map[t.id] = t.ticket_number; });
        setTickets(map);
      }
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const describe = (e: Entry) => {
    switch (e.field) {
      case 'status': {
        const oldL = e.old_value ? statusLabels[e.old_value] || e.old_value : '—';
        const newL = e.new_value ? statusLabels[e.new_value] || e.new_value : '—';
        return <>Status: <strong>{oldL}</strong> <ArrowRight className="inline h-3 w-3 mx-0.5" /> <strong>{newL}</strong></>;
      }
      case 'priority': {
        const oldL = e.old_value ? priorityLabels[e.old_value] || e.old_value : '—';
        const newL = e.new_value ? priorityLabels[e.new_value] || e.new_value : '—';
        return <>Prioridade: <strong>{oldL}</strong> <ArrowRight className="inline h-3 w-3 mx-0.5" /> <strong>{newL}</strong></>;
      }
      case 'assigned_to': {
        const oldL = e.old_value ? profiles[e.old_value] || 'Atendente' : 'Não atribuído';
        const newL = e.new_value ? profiles[e.new_value] || 'Atendente' : 'Não atribuído';
        return <>Atendente: <strong>{oldL}</strong> <ArrowRight className="inline h-3 w-3 mx-0.5" /> <strong>{newL}</strong></>;
      }
      case 'department_id': {
        const oldL = e.old_value ? departments[e.old_value] || '—' : '—';
        const newL = e.new_value ? departments[e.new_value] || '—' : '—';
        return <>Departamento: <strong>{oldL}</strong> <ArrowRight className="inline h-3 w-3 mx-0.5" /> <strong>{newL}</strong></>;
      }
      case 'tags': {
        const oldL = e.old_value && e.old_value.length > 0 ? e.old_value : '—';
        const newL = e.new_value && e.new_value.length > 0 ? e.new_value : '—';
        return <>Tags: <strong>{oldL}</strong> <ArrowRight className="inline h-3 w-3 mx-0.5" /> <strong>{newL}</strong></>;
      }
      case 'merged_into': {
        if (e.new_value && tickets[e.new_value]) {
          return <>Mesclado no ticket <strong>#{tickets[e.new_value]}</strong></>;
        }
        return <>Mesclagem revertida</>;
      }
      default:
        return <>{e.field}: {e.old_value || '—'} → {e.new_value || '—'}</>;
    }
  };

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">Carregando histórico...</p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Nenhuma alteração registrada ainda.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-2.5 text-xs">
          <div className="mt-0.5 flex-shrink-0">{fieldIcon(e.field)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-foreground">{describe(e)}</div>
            <div className="text-muted-foreground mt-0.5">
              {e.user_id && authors[e.user_id] ? authors[e.user_id] : 'Sistema'}
              {' · '}
              {format(new Date(e.created_at), "dd/MM HH:mm", { locale: ptBR })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
