import { useState, useEffect } from 'react';
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
import { MessageCircle, Mail, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ConnectedAccount {
  id: string;
  type: 'whatsapp' | 'email';
  name: string;
  identifier: string;
  isActive: boolean;
  config?: {
    imap?: { server: string; port: number };
    smtp?: { server: string; port: number };
  };
  provider?: string;
}

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ConnectedAccount | null;
  onAccountUpdated: (account: ConnectedAccount) => void;
}

export function EditAccountDialog({ open, onOpenChange, account, onAccountUpdated }: EditAccountDialogProps) {
  const [accountName, setAccountName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [imapServer, setImapServer] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setAccountName(account.name);
      setIdentifier(account.identifier);
      
      if (account.config?.imap) {
        setImapServer(account.config.imap.server);
        setImapPort(account.config.imap.port.toString());
      }
      
      if (account.config?.smtp) {
        setSmtpServer(account.config.smtp.server);
        setSmtpPort(account.config.smtp.port.toString());
      }
    }
  }, [account]);

  const handleSave = async () => {
    if (!account) return;

    if (!accountName || !identifier) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome da conta e o identificador.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsSaving(true);

    // Simulate save
    setTimeout(() => {
      const updatedAccount: ConnectedAccount = {
        ...account,
        name: accountName,
        identifier: identifier,
        config: account.type === 'email' && imapServer && smtpServer ? {
          imap: { server: imapServer, port: parseInt(imapPort) },
          smtp: { server: smtpServer, port: parseInt(smtpPort) },
        } : account.config,
      };

      onAccountUpdated(updatedAccount);
      setIsSaving(false);
      onOpenChange(false);

      toast({
        title: 'Conta atualizada!',
        description: `${accountName} foi atualizada com sucesso.`,
        variant: 'success' as const,
      });
    }, 1000);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {account.type === 'whatsapp' ? (
              <MessageCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Mail className="h-5 w-5 text-blue-600" />
            )}
            Editar Conta
          </DialogTitle>
          <DialogDescription>
            Atualize as informações da conta {account.type === 'whatsapp' ? 'WhatsApp' : 'Email'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-account-name">Nome da Conta</Label>
            <Input
              id="edit-account-name"
              placeholder="Ex: WhatsApp Principal"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-identifier">
              {account.type === 'whatsapp' ? 'Número de Telefone' : 'Email'}
            </Label>
            <Input
              id="edit-identifier"
              type={account.type === 'email' ? 'email' : 'text'}
              placeholder={account.type === 'whatsapp' ? '+55 11 99999-9999' : 'email@exemplo.com'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          {account.type === 'email' && account.config && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-imap-server">Servidor IMAP</Label>
                  <Input
                    id="edit-imap-server"
                    placeholder="imap.gmail.com"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-imap-port">Porta IMAP (SSL)</Label>
                  <Input
                    id="edit-imap-port"
                    placeholder="993"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-smtp-server">Servidor SMTP</Label>
                  <Input
                    id="edit-smtp-server"
                    placeholder="smtp.gmail.com"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-smtp-port">Porta SMTP (SSL)</Label>
                  <Input
                    id="edit-smtp-port"
                    placeholder="465"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
