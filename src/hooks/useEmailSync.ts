import { useState, useEffect, useCallback } from 'react';
import { syncEmailAccount, fetchMessages, getSyncStatus } from '@/lib/email-sync';
import { toast } from '@/hooks/use-toast';

interface UseEmailSyncOptions {
  accountId?: string;
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
}

export function useEmailSync(options: UseEmailSyncOptions = {}) {
  const { accountId, autoSync = false, syncInterval = 5 * 60 * 1000 } = options; // Default: 5 minutes
  
  const [messages, setMessages] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages from database
  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(accountId);
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  }, [accountId]);

  // Sync emails from IMAP server
  const syncEmails = useCallback(async (password: string) => {
    if (!accountId || accountId === 'all') {
      toast({
        title: 'Selecione uma conta',
        description: 'Escolha uma conta específica para sincronizar.',
        variant: 'warning' as const,
      });
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncEmailAccount(accountId, password);

      if (result.success) {
        setLastSyncTime(new Date());
        await loadMessages();
        
        toast({
          title: 'Emails sincronizados!',
          description: `${result.messagesCount || 0} nova(s) mensagem(ns) encontrada(s).`,
          variant: 'success' as const,
        });
      } else {
        setError(result.error || 'Erro ao sincronizar');
        toast({
          title: 'Erro na sincronização',
          description: result.error || 'Não foi possível sincronizar os emails.',
          variant: 'destructive' as const,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: 'Erro na sincronização',
        description: errorMessage,
        variant: 'destructive' as const,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [accountId, loadMessages]);

  // Get sync status for account
  const checkSyncStatus = useCallback(async () => {
    if (!accountId || accountId === 'all') return null;
    
    try {
      const status = await getSyncStatus(accountId);
      if (status?.last_sync_at) {
        setLastSyncTime(new Date(status.last_sync_at));
      }
      return status;
    } catch (err) {
      console.error('Error checking sync status:', err);
      return null;
    }
  }, [accountId]);

  // Load messages on mount and when accountId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Check sync status on mount
  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !accountId || accountId === 'all') return;

    const intervalId = setInterval(() => {
      // Auto-sync would need password stored securely
      // For now, just reload messages from database
      loadMessages();
    }, syncInterval);

    return () => clearInterval(intervalId);
  }, [autoSync, accountId, syncInterval, loadMessages]);

  return {
    messages,
    isSyncing,
    lastSyncTime,
    error,
    syncEmails,
    loadMessages,
    checkSyncStatus,
  };
}
