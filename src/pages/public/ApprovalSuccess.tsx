import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ApprovalSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-8 w-8" />
            <CardTitle>Resposta Registrada com Sucesso!</CardTitle>
          </div>
          <CardDescription>
            Sua resposta foi registrada e a equipe responsável foi notificada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Obrigado por revisar e responder à solicitação de aprovação. Caso tenha solicitado mudanças,
            entraremos em contato em breve com as atualizações necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}