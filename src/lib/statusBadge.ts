// Tons harmonizados para badges de status: fundo suave + texto da mesma cor
// (com variantes para dark mode). Use com <Badge variant="outline" className={BADGE_TONE.x}>.

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export const BADGE_TONE: Record<BadgeTone, string> = {
  success: 'border-transparent bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  warning: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  neutral: 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
};
