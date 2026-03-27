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
import { Mail, Loader2, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConnectEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountConnected: (account: any) => void;
}

export function ConnectEmailDialog({ open, onOpenChange, onAccountConnected }: ConnectEmailDialogProps) {
  const [method, setMethod] = useState<'oauth' | 'imap'>('oauth');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'other'>('gmail');
  
  // IMAP/SMTP fields
  const [imapServer, setImapServer] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [password, setPassword] = useState('');
  
  const [isConnecting, setIsConnecting] = useState(false);

  const handleOAuthConnect = async () => {
    if (!accountName || !email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome da conta e o email.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsConnecting(true);
    
    // Simulate OAuth flow
    setTimeout(() => {
      const newAccount = {
        id: Date.now().toString(),
        type: 'email' as const,
        name: accountName,
        identifier: email,
        isActive: true,
        status: 'connected' as const,
        provider: provider,
      };
      
      onAccountConnected(newAccount);
      setIsConnecting(false);
      onOpenChange(false);
      
      toast({
        title: 'Email conectado!',
        description: `Conta ${accountName} conectada com sucesso.`,
        variant: 'success' as const,
      });
      
      resetForm();
    }, 2000);
  };

  const handleIMAPConnect = async () => {
    if (!accountName || !email || !imapServer || !smtpServer || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsConnecting(true);
    
    // Simulate IMAP connection
    setTimeout(() => {
      const newAccount = {
        id: Date.now().toString(),
        type: 'email' as const,
        name: accountName,
        identifier: email,
        isActive: true,
        status: 'connected' as const,
        provider: 'custom',
        config: {
          imap: { server: imapServer, port: parseInt(imapPort) },
          smtp: { server: smtpServer, port: parseInt(smtpPort) },
          password: password,
        },
      };
      
      onAccountConnected(newAccount);
      setIsConnecting(false);
      onOpenChange(false);
      
      toast({
        title: 'Email conectado!',
        description: `Conta ${accountName} conectada com sucesso.`,
        variant: 'success' as const,
      });
      
      resetForm();
    }, 2000);
  };

  const resetForm = () => {
    setAccountName('');
    setEmail('');
    setProvider('gmail');
    setImapServer('');
    setImapPort('993');
    setSmtpServer('');
    setSmtpPort('587');
    setPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Conectar Email
          </DialogTitle>
          <DialogDescription>
            Conecte uma conta de email para receber e enviar mensagens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Method Selection */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={method === 'oauth' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMethod('oauth')}
              className={method === 'oauth' ? 'flex-1 bg-[#141924] hover:bg-[#1a2030]' : 'flex-1'}
            >
              OAuth (Recomendado)
            </Button>
            <Button
              variant={method === 'imap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMethod('imap')}
              className={method === 'imap' ? 'flex-1 bg-[#141924] hover:bg-[#1a2030]' : 'flex-1'}
            >
              IMAP/SMTP
            </Button>
          </div>

          {/* Common Fields */}
          <div className="space-y-2">
            <Label htmlFor="email-account-name">Nome da Conta</Label>
            <Input
              id="email-account-name"
              placeholder="Ex: Email Comercial"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-address">Endereço de Email</Label>
            <Input
              id="email-address"
              type="email"
              placeholder="contato@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* OAuth Method */}
          {method === 'oauth' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provedor</Label>
                <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Gmail / Google Workspace
                      </div>
                    </SelectItem>
                    <SelectItem value="outlook">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Outlook / Microsoft 365
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Outro provedor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-medium mb-1">Autenticação OAuth</p>
                <p className="text-xs">
                  Você será redirecionado para fazer login de forma segura com {provider === 'gmail' ? 'Google' : provider === 'outlook' ? 'Microsoft' : 'seu provedor'}.
                </p>
              </div>

              <Button 
                onClick={handleOAuthConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Conectar com {provider === 'gmail' ? 'Google' : provider === 'outlook' ? 'Microsoft' : 'OAuth'}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* IMAP/SMTP Method */}
          {method === 'imap' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-server">Servidor IMAP</Label>
                  <Input
                    id="imap-server"
                    placeholder="imap.gmail.com"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-port">Porta IMAP (SSL)</Label>
                  <Input
                    id="imap-port"
                    placeholder="993"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">Servidor SMTP</Label>
                  <Input
                    id="smtp-server"
                    placeholder="smtp.gmail.com"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta SMTP (SSL)</Label>
                  <Input
                    id="smtp-port"
                    placeholder="465"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha / App Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium mb-1">Configuração Manual (SSL/TLS)</p>
                <p className="text-xs">
                  Conexão segura habilitada. IMAP: porta 993, SMTP: porta 465.
                  Para Gmail/Outlook, use uma senha de aplicativo.
                </p>
              </div>

              <Button 
                onClick={handleIMAPConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando conexão...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
