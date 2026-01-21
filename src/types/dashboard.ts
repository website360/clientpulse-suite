export type WidgetType = 
  | 'quick-stats'
  | 'financial-summary'
  | 'tickets-overview'
  | 'projects-carousel'
  | 'tasks'
  | 'maintenance'
  | 'domains-chart'
  | 'contracts-chart';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type WidgetHeight = 'auto' | 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: WidgetType;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  defaultHeight: WidgetHeight;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  height: WidgetHeight;
  order: number;
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  'quick-stats': {
    id: 'quick-stats',
    title: 'Estatísticas Rápidas',
    description: 'Resumo de tickets, clientes e valores',
    defaultSize: 'full',
    defaultHeight: 'auto',
  },
  'financial-summary': {
    id: 'financial-summary',
    title: 'Resumo Financeiro',
    description: 'Visão geral de receitas e despesas',
    defaultSize: 'full',
    defaultHeight: 'auto',
  },
  'tickets-overview': {
    id: 'tickets-overview',
    title: 'Visão de Tickets',
    description: 'Status dos tickets de suporte',
    defaultSize: 'full',
    defaultHeight: 'auto',
  },
  'projects-carousel': {
    id: 'projects-carousel',
    title: 'Projetos',
    description: 'Carrossel de projetos em andamento',
    defaultSize: 'full',
    defaultHeight: 'auto',
  },
  'tasks': {
    id: 'tasks',
    title: 'Tarefas',
    description: 'Lista de tarefas pendentes',
    defaultSize: 'medium',
    defaultHeight: 'medium',
  },
  'maintenance': {
    id: 'maintenance',
    title: 'Manutenções',
    description: 'Status das manutenções',
    defaultSize: 'medium',
    defaultHeight: 'medium',
  },
  'domains-chart': {
    id: 'domains-chart',
    title: 'Domínios',
    description: 'Gráfico de status dos domínios',
    defaultSize: 'medium',
    defaultHeight: 'medium',
  },
  'contracts-chart': {
    id: 'contracts-chart',
    title: 'Contratos',
    description: 'Gráfico de status dos contratos',
    defaultSize: 'medium',
    defaultHeight: 'medium',
  },
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'quick-stats', type: 'quick-stats', size: 'full', height: 'auto', order: 0 },
  { id: 'financial-summary', type: 'financial-summary', size: 'full', height: 'auto', order: 1 },
  { id: 'tickets-overview', type: 'tickets-overview', size: 'full', height: 'auto', order: 2 },
  { id: 'projects-carousel', type: 'projects-carousel', size: 'full', height: 'auto', order: 3 },
  { id: 'tasks', type: 'tasks', size: 'medium', height: 'medium', order: 4 },
  { id: 'maintenance', type: 'maintenance', size: 'medium', height: 'medium', order: 5 },
  { id: 'domains-chart', type: 'domains-chart', size: 'medium', height: 'medium', order: 6 },
  { id: 'contracts-chart', type: 'contracts-chart', size: 'medium', height: 'medium', order: 7 },
];
