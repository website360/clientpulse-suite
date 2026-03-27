import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Card as CardRow } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, Eye, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [selectedTable, selectedAction]);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable);
      }

      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }

      const { data: logsData, error } = await query;

      if (error) throw error;

      // Buscar profiles dos usuários
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean))] as string[];
      
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        profilesData = data || [];
      }

      // Combinar dados
      const logsWithProfiles = (logsData || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        profiles: profilesData.find(p => p.id === log.user_id) || null
      }));

      setLogs(logsWithProfiles as AuditLog[]);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Erro ao carregar logs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Data/Hora', 'Usuário', 'Ação', 'Tabela', 'IP', 'User Agent'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        log.profiles?.full_name || log.profiles?.email || 'Sistema',
        log.action,
        log.table_name,
        log.ip_address || '-',
        log.user_agent || '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();

    toast({
      title: 'Logs exportados',
      description: 'O arquivo CSV foi baixado com sucesso.',
    });
  };

  const filteredLogs = logs.filter(log =>
    searchTerm === '' ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
      case 'CREATE':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'DELETE':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Logs de Auditoria
        </CardTitle>
        <CardDescription>
          Histórico completo de ações críticas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              <SelectItem value="clients">Clientes</SelectItem>
              <SelectItem value="tickets">Tickets</SelectItem>
              <SelectItem value="accounts_receivable">Contas a Receber</SelectItem>
              <SelectItem value="accounts_payable">Contas a Pagar</SelectItem>
              <SelectItem value="contracts">Contratos</SelectItem>
              <SelectItem value="users">Usuários</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="INSERT">Criar</SelectItem>
              <SelectItem value="UPDATE">Atualizar</SelectItem>
              <SelectItem value="DELETE">Excluir</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Tabela de Logs */}
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando logs...</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data/Hora</span></div>
              <div className="col-span-3"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Usuário</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ação</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tabela</span></div>
              <div className="col-span-2"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IP</span></div>
              <div className="col-span-1 text-right"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Det.</span></div>
            </div>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border">
                <p className="text-[13px] text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <CardRow key={log.id} className="rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 20}ms` }}>
                  <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                    <div className="col-span-2">
                      <p className="text-[13px] font-mono text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[14px] font-medium text-foreground truncate">{log.profiles?.full_name || 'Sistema'}</p>
                      {log.profiles?.email && <p className="text-[12px] text-muted-foreground truncate">{log.profiles.email}</p>}
                    </div>
                    <div className="col-span-2"><Badge className={getActionColor(log.action)}>{log.action}</Badge></div>
                    <div className="col-span-2"><p className="text-[13px] font-mono text-muted-foreground">{log.table_name}</p></div>
                    <div className="col-span-2"><p className="text-[13px] font-mono text-muted-foreground">{log.ip_address || '-'}</p></div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => console.log('Log details:', log)}><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardRow>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}