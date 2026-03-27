import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Loader2 } from 'lucide-react';
import { syncEmailAccount } from '@/lib/email-sync';
import { toast } from '@/hooks/use-toast';

interface SyncEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  accountEmail: string;
  imapServer: string;
  imapPort: number;
  storedPassword?: string;
  onSyncComplete?: () => void;
}

export function SyncEmailDialog({ 
  open, 
  onOpenChange, 
  accountId, 
  accountName,
  accountEmail,
  imapServer,
  imapPort,
  storedPassword,
  onSyncComplete 
}: SyncEmailDialogProps) {
  const [password, setPassword] = useState(storedPassword || '');
  const hasStoredPassword = !!storedPassword;
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    const passwordToUse = password || storedPassword;
    
    if (!passwordToUse) {
      toast({
        title: 'Senha necessária',
        description: 'Digite a senha do email para sincronizar.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncEmailAccount(accountId, passwordToUse, accountEmail, imapServer, imapPort);

      if (result.success) {
        toast({
          title: 'Emails sincronizados!',
          description: `${result.messagesCount || 0} nova(s) mensagem(ns) encontrada(s).`,
          variant: 'success' as const,
        });
        setPassword('');
        onOpenChange(false);
        onSyncComplete?.();
      } else {
        toast({
          title: 'Erro na sincronização',
          description: result.error || 'Não foi possível sincronizar os emails.',
          variant: 'destructive' as const,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' as const,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Sincronizar Emails</DialogTitle>
              <DialogDescription className="mt-1">
                {accountName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasStoredPassword && (
            <div className="space-y-2">
              <Label htmlFor="sync-password">Senha do Email</Label>
              <Input
                id="sync-password"
                type="password"
                placeholder="Digite a senha ou App Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSyncing) {
                    handleSync();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Para Gmail/Outlook, use uma senha de aplicativo.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">
              {hasStoredPassword ? 'Sincronização Automática' : 'Primeira Sincronização'}
            </p>
            <p className="text-xs">
              {hasStoredPassword 
                ? 'Usando senha configurada. Isso buscará os emails mais recentes do servidor IMAP.'
                : 'Isso buscará os emails mais recentes do servidor IMAP. A senha será armazenada para sincronizações futuras.'
              }
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPassword('');
                onOpenChange(false);
              }}
              className="flex-1"
              disabled={isSyncing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSync}
              disabled={isSyncing || !password}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Sincronizar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
