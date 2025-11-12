import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ticket, Users, DollarSign, FolderKanban, BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function WelcomeModal() {
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome-modal-seen');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('welcome-modal-seen', 'true');
    setOpen(false);
  };

  const adminFeatures = [
    {
      icon: Ticket,
      title: 'Tickets de Suporte',
      description: 'Gerencie solicitações de clientes com prioridades e SLA'
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'Cadastre e gerencie informações completas dos seus clientes'
    },
    {
      icon: FolderKanban,
      title: 'Projetos',
      description: 'Acompanhe projetos com etapas, checklists e aprovações'
    },
    {
      icon: DollarSign,
      title: 'Financeiro',
      description: 'Controle contas a pagar/receber com integração Asaas'
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Analise métricas e performance do seu negócio'
    },
    {
      icon: CheckCircle,
      title: 'Tarefas e Manutenção',
      description: 'Organize tarefas e planos de manutenção recorrentes'
    }
  ];

  const clientFeatures = [
    {
      icon: Ticket,
      title: 'Meus Tickets',
      description: 'Abra e acompanhe suas solicitações de suporte'
    },
    {
      icon: DollarSign,
      title: 'Contratos',
      description: 'Visualize seus contratos e serviços ativos'
    },
    {
      icon: BarChart3,
      title: 'Dashboard',
      description: 'Acompanhe o status dos seus tickets e serviços'
    }
  ];

  const features = userRole === 'admin' ? adminFeatures : clientFeatures;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Bem-vindo ao ClientPulse Suite! 👋
          </DialogTitle>
          <DialogDescription className="text-base">
            {userRole === 'admin' 
              ? 'Uma plataforma completa para gerenciar seu negócio de forma eficiente.'
              : 'Sua central de atendimento e acompanhamento de serviços.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {userRole === 'admin' && (
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Use <kbd className="px-2 py-1 bg-background rounded text-xs border">Ctrl+K</kbd> para busca rápida em todo o sistema.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Começar a usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
