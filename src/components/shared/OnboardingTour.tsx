import Joyride, { CallBackProps, Step, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useTour } from '@/hooks/useTour';
import { useConfetti } from '@/hooks/useConfetti';

export function OnboardingTour() {
  const { run, stepIndex, setStepIndex, completeTour, skipTour } = useTour();
  const { fireMultipleConfetti } = useConfetti();

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Bem-vindo ao Sistema! 🎉</h2>
          <p>Vamos fazer um tour rápido pelas principais funcionalidades do sistema.</p>
          <p className="text-sm text-muted-foreground">Você pode pular este tour a qualquer momento.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-metrics"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Métricas em Tempo Real</h3>
          <p>Acompanhe as principais métricas do seu negócio em cards informativos.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="sidebar-tickets"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Tickets de Suporte</h3>
          <p>Gerencie solicitações de clientes, atribua prioridades e acompanhe o status.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-clients"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Gestão de Clientes</h3>
          <p>Cadastre e gerencie informações completas dos seus clientes.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-projects"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Projetos</h3>
          <p>Acompanhe o progresso de projetos com etapas, checklists e aprovações.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-financial"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Financeiro</h3>
          <p>Gerencie contas a pagar e receber com integração ao Asaas.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="global-search"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Busca Global</h3>
          <p>Use <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd> para buscar rapidamente qualquer coisa no sistema.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Notificações</h3>
          <p>Receba alertas sobre tickets, aprovações, SLA e vencimentos.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="user-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-bold">Menu do Usuário</h3>
          <p>Acesse configurações, perfil e preferências do sistema.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Tour Concluído! 🎊</h2>
          <p>Você está pronto para começar a usar o sistema.</p>
          <p className="text-sm text-muted-foreground">
            Pressione <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd> a qualquer momento para ver os atalhos de teclado disponíveis.
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      if (status === STATUS.FINISHED) {
        fireMultipleConfetti();
        completeTour();
      } else {
        skipTour();
      }
    } else if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
      styles={{
        options: {
          arrowColor: 'hsl(var(--popover))',
          backgroundColor: 'hsl(var(--popover))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--popover-foreground))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '14px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 8,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
    />
  );
}
