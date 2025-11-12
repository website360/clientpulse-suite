import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Check, Smartphone, Zap, Wifi, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installApp } = usePWA();

  useEffect(() => {
    if (isInstalled) {
      toast.success('App já está instalado!');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [isInstalled, navigate]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast.success('App instalado com sucesso!');
      setTimeout(() => navigate('/'), 2000);
    } else {
      toast.error('Não foi possível instalar. Tente novamente.');
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Acesso Rápido',
      description: 'Abra direto da tela inicial, sem navegador',
    },
    {
      icon: Wifi,
      title: 'Funciona Offline',
      description: 'Visualize dados mesmo sem internet',
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Receba alertas importantes em tempo real',
    },
    {
      icon: Smartphone,
      title: 'Experiência Nativa',
      description: 'Interface otimizada para mobile',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary rounded-2xl">
              <Download className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">Instale a Agência May</h1>
          <p className="text-muted-foreground text-lg">
            Tenha o app sempre à mão na tela do seu dispositivo
          </p>
        </div>

        {/* Install Button */}
        {isInstalled ? (
          <Card className="border-success">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <CardTitle>App Instalado!</CardTitle>
                  <CardDescription>Redirecionando...</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : isInstallable ? (
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleInstall} size="lg" className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Instalar Agência May
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                O app ficará disponível na tela inicial do seu dispositivo
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Como instalar</CardTitle>
              <CardDescription>Siga as instruções do seu navegador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">iPhone/iPad (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Toque no botão Compartilhar</li>
                  <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Toque no menu (⋮) no canto superior</li>
                  <li>Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                  <li>Confirme a instalação</li>
                </ol>
              </div>

              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Voltar ao App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Install;
