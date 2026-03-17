import { useState, useEffect, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { MessageCircle, QrCode, Smartphone, Loader2, RefreshCw, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConnectWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountConnected: (account: any) => void;
}

export function ConnectWhatsAppDialog({ open, onOpenChange, onAccountConnected }: ConnectWhatsAppDialogProps) {
  const [step, setStep] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // When dialog opens, fetch QR code
  useEffect(() => {
    if (open) {
      fetchQRCode();
    } else {
      // Reset state when closing
      if (pollRef.current) clearInterval(pollRef.current);
      setStep('loading');
      setQrCode(null);
      setPairingCode(null);
      setErrorMessage(null);
      setConnectionStatus('disconnected');
    }
  }, [open]);

  const fetchQRCode = async () => {
    setIsLoading(true);
    setStep('loading');
    setErrorMessage(null);

    try {
      // First check if already connected
      const { data: statusData, error: statusError } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'check_status' },
      });

      if (!statusError && statusData?.success) {
        const state = statusData.status?.toLowerCase() || '';
        if (state === 'open' || state === 'connected') {
          setStep('connected');
          setConnectionStatus('connected');
          setIsLoading(false);
          return;
        }
      }

      // Not connected, get QR code
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'get_qr' },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar QR Code');
      }

      if (data?.success && data?.qrcode) {
        // QR code can be base64 image data
        let qrSrc = data.qrcode;
        if (!qrSrc.startsWith('data:')) {
          qrSrc = `data:image/png;base64,${qrSrc}`;
        }
        setQrCode(qrSrc);
        setPairingCode(data.pairingCode || null);
        setStep('qr');
        startPolling();
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('QR Code não retornado pela API. Verifique as configurações da Evolution API em Configurações > Integrações.');
      }
    } catch (err: any) {
      console.error('Error fetching QR:', err);
      setErrorMessage(err.message || 'Erro desconhecido');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);

    // Poll every 5s to check if phone scanned
    pollRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: { action: 'check_status' },
        });

        if (!error && data?.success) {
          const state = (data.status || '').toLowerCase();
          if (state === 'open' || state === 'connected') {
            if (pollRef.current) clearInterval(pollRef.current);
            setConnectionStatus('connected');
            setStep('connected');

            // Auto-create the account
            const newAccount = {
              id: `wa-${Date.now()}`,
              type: 'whatsapp' as const,
              name: accountName || 'WhatsApp',
              identifier: 'WhatsApp via Evolution API',
              isActive: true,
              status: 'connected' as const,
            };
            onAccountConnected(newAccount);

            toast({
              title: 'WhatsApp conectado!',
              description: 'O telefone escaneou o QR Code com sucesso.',
              variant: 'success' as const,
            });
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);
  };

  const handleRefreshQR = () => {
    fetchQRCode();
  };

  const handleManualConnect = () => {
    if (!accountName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Preencha o nome da conta.',
        variant: 'destructive' as const,
      });
      return;
    }

    const newAccount = {
      id: `wa-${Date.now()}`,
      type: 'whatsapp' as const,
      name: accountName,
      identifier: 'WhatsApp via Evolution API',
      isActive: true,
      status: 'connected' as const,
    };
    onAccountConnected(newAccount);
    onOpenChange(false);

    toast({
      title: 'WhatsApp conectado!',
      description: `Conta ${accountName} adicionada.`,
      variant: 'success' as const,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {step === 'loading' && 'Carregando QR Code da Evolution API...'}
            {step === 'qr' && 'Escaneie o QR Code com seu WhatsApp'}
            {step === 'connected' && 'WhatsApp já está conectado!'}
            {step === 'error' && 'Erro ao conectar'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="wa-account-name">Nome da Conta</Label>
            <Input
              id="wa-account-name"
              placeholder="Ex: WhatsApp Principal"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <p className="text-sm text-muted-foreground mt-3">Conectando à Evolution API...</p>
            </div>
          )}

          {/* QR Code */}
          {step === 'qr' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                {qrCode ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
                    </div>
                    
                    {pairingCode && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Ou use o código de pareamento:</p>
                        <Badge variant="outline" className="text-lg font-mono tracking-widest px-4 py-1">
                          {pairingCode}
                        </Badge>
                      </div>
                    )}

                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Escaneie com seu WhatsApp
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wifi className="h-3 w-3 animate-pulse text-green-500" />
                      Aguardando leitura do QR Code...
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">QR Code não disponível</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefreshQR} disabled={isLoading} className="flex-1 gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Novo QR Code
                </Button>
                <Button 
                  onClick={handleManualConnect}
                  disabled={!accountName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Já escaneei
                </Button>
              </div>
            </div>
          )}

          {/* Connected */}
          {step === 'connected' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-green-200 rounded-lg bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                <CheckCircle2 className="h-16 w-16 text-green-600 mb-3" />
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground mt-1">Sua instância Evolution API está ativa.</p>
              </div>

              <Button 
                onClick={handleManualConnect}
                disabled={!accountName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Adicionar Conta
              </Button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-destructive/30 rounded-lg bg-destructive/5">
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <p className="text-sm font-medium text-destructive">Erro ao gerar QR Code</p>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-sm">
                  {errorMessage}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Verifique:</p>
                <p>• Evolution API configurada em <strong>Configurações → Integrações</strong></p>
                <p>• URL da API, API Key e Nome da Instância corretos</p>
                <p>• Servidor da Evolution API está rodando</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Fechar
                </Button>
                <Button onClick={handleRefreshQR} disabled={isLoading} className="flex-1 gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
