import { useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

export function InstallPrompt() {
  const { isInstallable, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      toast.success('App instalado com sucesso!');
      setDismissed(true);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-[350px] shadow-lg z-50 animate-slide-in-right">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Instalar App</CardTitle>
            <CardDescription>Acesse mais rápido</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Instale a Agência May na tela inicial do seu dispositivo para acesso rápido e uso offline.
        </p>
        
        <Button onClick={handleInstall} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Instalar Agora
        </Button>
      </CardContent>
    </Card>
  );
}
