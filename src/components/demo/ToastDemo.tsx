import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, toastSuccess, toastError, toastWarning, toastInfo } from "@/hooks/use-toast";
import { showSuccess, showError, showWarning, showInfo } from "@/lib/toast-helpers";

export function ToastDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistema de Notificações Toast</CardTitle>
        <CardDescription>
          Demonstração dos diferentes tipos de notificações com animações suaves
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Usando helpers diretos:</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => showSuccess("Sucesso!", "Operação concluída com êxito")}
                className="w-full border-green-500/50 hover:bg-green-50"
              >
                Sucesso
              </Button>
              <Button
                variant="outline"
                onClick={() => showError("Erro!", "Não foi possível concluir a operação")}
                className="w-full border-red-500/50 hover:bg-red-50"
              >
                Erro
              </Button>
              <Button
                variant="outline"
                onClick={() => showWarning("Atenção!", "Verifique os dados antes de prosseguir")}
                className="w-full border-amber-500/50 hover:bg-amber-50"
              >
                Aviso
              </Button>
              <Button
                variant="outline"
                onClick={() => showInfo("Informação", "Sistema atualizado para versão 2.0")}
                className="w-full border-blue-500/50 hover:bg-blue-50"
              >
                Info
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Usando hook direto:</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => toastSuccess("Cliente cadastrado", "Dados salvos com sucesso")}
                className="w-full border-green-500/50 hover:bg-green-50"
              >
                Toast Sucesso
              </Button>
              <Button
                variant="outline"
                onClick={() => toastError("Falha no servidor", "Tente novamente mais tarde")}
                className="w-full border-red-500/50 hover:bg-red-50"
              >
                Toast Erro
              </Button>
              <Button
                variant="outline"
                onClick={() => toastWarning("Campos obrigatórios", "Preencha todos os campos marcados")}
                className="w-full border-amber-500/50 hover:bg-amber-50"
              >
                Toast Aviso
              </Button>
              <Button
                variant="outline"
                onClick={() => toastInfo("Dica", "Use Ctrl+K para busca rápida")}
                className="w-full border-blue-500/50 hover:bg-blue-50"
              >
                Toast Info
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Toast com ação:</h3>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Arquivo baixado",
                description: "relatório-mensal.pdf foi salvo",
                variant: "success",
                action: (
                  <button
                    onClick={() => alert("Abrir arquivo")}
                    className="text-sm font-medium underline hover:no-underline"
                  >
                    Abrir
                  </button>
                ),
              })
            }
            className="w-full"
          >
            Toast com Ação
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-semibold mb-1">Como usar no código:</p>
          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`import { showSuccess, showError } from '@/lib/toast-helpers';

showSuccess('Título', 'Descrição');
showError('Título', 'Descrição');`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
