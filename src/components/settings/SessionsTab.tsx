import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Monitor, Smartphone, Tablet, Trash2, AlertTriangle } from 'lucide-react';
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Expira Em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma sessão ativa
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const expired = isExpired(session.expires_at);
                    const inactive = isInactive(session.last_activity);

                    return (
                      <TableRow key={session.id} className={expired ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {session.profiles?.full_name || 'Usuário'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {session.profiles?.email || '-'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.user_agent)}
                            <span className="text-sm text-muted-foreground">
                              {session.user_agent ? session.user_agent.substring(0, 30) + '...' : 'Desconhecido'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {session.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(session.last_activity), "dd/MM/yy HH:mm", { locale: ptBR })}
                            {inactive && !expired && (
                              <Badge variant="outline" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Inativa
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.expires_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expired ? 'destructive' : 'default'}>
                            {expired ? 'Expirada' : 'Ativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeSession(session.id)}
                            disabled={expired}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}