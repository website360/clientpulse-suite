export type WidgetType = 
  | 'quick-stats'
  | 'financial-summary'
  | 'tickets-overview'
  | 'projects-carousel'
  | 'tasks'
  | 'maintenance'
  | 'domains-chart'
  | 'contracts-chart';

export interface WidgetConfig {
  id: WidgetType;
  title: string;
  description: string;
  defaultSize: 'small' | 'medium' | 'large' | 'full';
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  'quick-stats': {
    id: 'quick-stats',
    title: 'Estatísticas Rápidas',
    description: 'Resumo de tickets, clientes e valores',
    defaultSize: 'full',
  },
  'financial-summary': {
    id: 'financial-summary',
    title: 'Resumo Financeiro',
    description: 'Visão geral de receitas e despesas',
    defaultSize: 'full',
  },
  'tickets-overview': {
    id: 'tickets-overview',
    title: 'Visão de Tickets',
    description: 'Status dos tickets de suporte',
    defaultSize: 'full',
  },
  'projects-carousel': {
    id: 'projects-carousel',
    title: 'Projetos',
    description: 'Carrossel de projetos em andamento',
    defaultSize: 'full',
  },
  'tasks': {
    id: 'tasks',
    title: 'Tarefas',
    description: 'Lista de tarefas pendentes',
    defaultSize: 'medium',
  },
  'maintenance': {
    id: 'maintenance',
    title: 'Manutenções',
    description: 'Status das manutenções',
    defaultSize: 'medium',
  },
  'domains-chart': {
    id: 'domains-chart',
    title: 'Domínios',
    description: 'Gráfico de status dos domínios',
    defaultSize: 'medium',
  },
  'contracts-chart': {
    id: 'contracts-chart',
    title: 'Contratos',
    description: 'Gráfico de status dos contratos',
    defaultSize: 'medium',
  },
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'quick-stats', type: 'quick-stats', size: 'full', order: 0 },
  { id: 'financial-summary', type: 'financial-summary', size: 'full', order: 1 },
  { id: 'tickets-overview', type: 'tickets-overview', size: 'full', order: 2 },
  { id: 'projects-carousel', type: 'projects-carousel', size: 'full', order: 3 },
  { id: 'tasks', type: 'tasks', size: 'medium', order: 4 },
  { id: 'maintenance', type: 'maintenance', size: 'medium', order: 5 },
  { id: 'domains-chart', type: 'domains-chart', size: 'medium', order: 6 },
  { id: 'contracts-chart', type: 'contracts-chart', size: 'medium', order: 7 },
];
