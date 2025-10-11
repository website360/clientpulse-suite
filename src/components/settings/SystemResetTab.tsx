import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SystemResetTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetSystem = async () => {
    if (!password) {
      toast({
        title: 'Senha necessária',
        description: 'Por favor, insira sua senha para confirmar.',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      // Chamar edge function para resetar o sistema
      const { data, error } = await supabase.functions.invoke('reset-system', {
        body: { password },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sistema resetado',
          description: 'Todos os dados foram removidos com sucesso. Redirecionando...',
        });

        // Aguardar 2 segundos e recarregar
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error(data.message || 'Erro ao resetar sistema');
      }
    } catch (error: any) {
      console.error('Error resetting system:', error);
      toast({
        title: 'Erro ao resetar sistema',
        description: error.message || 'Verifique sua senha e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
      setShowConfirmDialog(false);
      setPassword('');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Operações irreversíveis que afetam todo o sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Resetar Sistema Completo</h3>
              <p className="text-sm text-muted-foreground">
                Esta ação irá remover todos os dados do sistema, incluindo:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Todos os clientes e contatos</li>
                <li>Todos os tickets e mensagens</li>
                <li>Todos os contratos e domínios</li>
                <li>Todas as contas a pagar e a receber</li>
                <li>Todas as notificações</li>
                <li>Anexos e arquivos enviados</li>
              </ul>
              <p className="text-sm font-semibold text-destructive mt-3">
                ⚠️ Apenas o login do administrador atual será mantido.
              </p>
              <p className="text-sm font-semibold text-destructive">
                ⚠️ Esta ação é IRREVERSÍVEL e não pode ser desfeita!
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                'Resetar Sistema Completo'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Reset do Sistema
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                Esta ação irá APAGAR PERMANENTEMENTE todos os dados do sistema!
              </p>
              <p>
                Para confirmar, insira sua senha de administrador abaixo:
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-password">Senha do Administrador</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isResetting}
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSystem}
              disabled={isResetting || !password}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                'Confirmar Reset'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}