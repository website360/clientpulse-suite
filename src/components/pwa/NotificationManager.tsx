import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermission, isNotificationSupported } from '@/utils/notifications';
import { toast } from 'sonner';

export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notificações ativadas com sucesso!');
    } else if (result === 'denied') {
      toast.error('Permissão de notificações negada. Ative nas configurações do navegador.');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <div className="p-2 bg-success/10 rounded-lg">
                <Bell className="h-5 w-5 text-success" />
              </div>
            ) : (
              <div className="p-2 bg-muted rounded-lg">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">Notificações Web</CardTitle>
              <CardDescription>
                {permission === 'granted' 
                  ? 'Você receberá notificações' 
                  : 'Ative para receber alertas importantes'}
              </CardDescription>
            </div>
          </div>

          {permission === 'granted' ? (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Ativado</span>
            </div>
          ) : permission === 'denied' ? (
            <div className="flex items-center gap-2 text-destructive">
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">Bloqueado</span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      {permission !== 'granted' && (
        <CardContent>
          {permission === 'denied' ? (
            <p className="text-sm text-muted-foreground">
              As notificações estão bloqueadas. Para ativar, acesse as configurações do seu navegador e permita notificações para este site.
            </p>
          ) : (
            <Button onClick={handleEnableNotifications} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
