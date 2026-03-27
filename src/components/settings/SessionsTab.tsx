import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Card as CardRow } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Monitor, Smartphone, Tablet, Trash2, AlertTriangle, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  last_activity: string;
  expires_at: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity', { ascending: false });

      if (error) throw error;

      // Buscar profiles dos usuários
      const userIds = [...new Set(sessionsData?.map(s => s.user_id))] as string[];
      
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        profilesData = data || [];
      }

      // Combinar dados
      const sessionsWithProfiles = (sessionsData || []).map(session => ({
        ...session,
        ip_address: session.ip_address as string | null,
        profiles: profilesData.find(p => p.id === session.user_id) || null
      }));

      setSessions(sessionsWithProfiles as UserSession[]);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Erro ao carregar sessões',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja encerrar esta sessão?')) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Sessão encerrada',
        description: 'A sessão foi encerrada com sucesso.',
      });

      fetchSessions();
    } catch (error: any) {
      toast({
        title: 'Erro ao encerrar sessão',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isInactive = (lastActivity: string) => {
    const inactiveMinutes = (new Date().getTime() - new Date(lastActivity).getTime()) / 60000;
    return inactiveMinutes > 30;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Sessões Ativas
        </CardTitle>
        <CardDescription>
          Gerencie as sessões ativas dos usuários no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando sessões...</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Usuário</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Dispositivo</span></div>
              <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IP</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Últ. Atividade</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expira Em</span></div>
              <div className="col-span-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span></div>
              <div className="col-span-1 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span></div>
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border">
                <p className="text-[13px] text-muted-foreground">Nenhuma sessão ativa</p>
              </div>
            ) : (
              sessions.map((session, index) => {
                const expired = isExpired(session.expires_at);
                const inactive = isInactive(session.last_activity);
                return (
                  <CardRow key={session.id} className={`rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden ${expired ? 'opacity-50' : ''}`} style={{ animationDelay: `${index * 20}ms` }}>
                    <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                      <div className="col-span-2">
                        <p className="text-[14px] font-medium text-foreground truncate">{session.profiles?.full_name || 'Usuário'}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{session.profiles?.email || '-'}</p>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.user_agent)}
                          <span className="text-[13px] text-muted-foreground truncate">{session.user_agent ? session.user_agent.substring(0, 30) + '...' : 'Desconhecido'}</span>
                        </div>
                      </div>
                      <div className="col-span-1"><p className="text-[13px] font-mono text-muted-foreground">{session.ip_address || '-'}</p></div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] text-muted-foreground">{format(new Date(session.last_activity), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          {inactive && !expired && <Badge variant="outline" className="text-[11px] px-1.5 py-0"><AlertTriangle className="h-3 w-3 mr-0.5" />Inativa</Badge>}
                        </div>
                      </div>
                      <div className="col-span-2"><p className="text-[13px] text-muted-foreground">{format(new Date(session.expires_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p></div>
                      <div className="col-span-1">
                        <Badge variant="default" className={expired ? 'font-medium px-2.5 py-0.5 flex items-center gap-1 w-fit bg-red-50 text-red-700 border-0 hover:bg-red-50' : 'font-medium px-2.5 py-0.5 flex items-center gap-1 w-fit bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-50'}>
                          <Circle className={`h-2 w-2 ${expired ? 'fill-red-500 text-red-500' : 'fill-emerald-500 text-emerald-500'}`} />
                          {expired ? 'Exp.' : 'Ativa'}
                        </Badge>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => revokeSession(session.id)} disabled={expired}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardRow>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}