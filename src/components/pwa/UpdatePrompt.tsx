import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          
          // Check for updates periodically
          const interval = setInterval(() => {
            reg.update();
          }, 60000); // Check every minute

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          });

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível!', {
        description: 'Clique em "Atualizar" para aplicar a nova versão.',
        action: {
          label: 'Atualizar',
          onClick: handleUpdate,
        },
        duration: Infinity,
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      registration.waiting.addEventListener('statechange', (e) => {
        const target = e.target as ServiceWorker;
        if (target.state === 'activated') {
          window.location.reload();
        }
      });
    }
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[350px] shadow-lg z-50 animate-slide-in-right">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => setNeedRefresh(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Nova Versão</CardTitle>
            <CardDescription>Atualização disponível</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Uma nova versão do sistema está disponível. Clique em "Atualizar" para aplicar as melhorias.
        </p>
        
        <Button 
          onClick={handleUpdate} 
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Agora
        </Button>
      </CardContent>
    </Card>
  );
}
