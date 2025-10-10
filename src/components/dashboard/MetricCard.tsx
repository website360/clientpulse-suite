import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'success' | 'destructive';
}

export function MetricCard({ title, value, icon: Icon, trend, className, variant = 'default' }: MetricCardProps) {
  const getIconColor = () => {
    if (variant === 'success') return 'text-emerald-600 dark:text-emerald-400';
    if (variant === 'destructive') return 'text-rose-600 dark:text-rose-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getIconBg = () => {
    if (variant === 'success') return 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 group-hover:from-emerald-100 group-hover:to-emerald-50 dark:group-hover:from-emerald-900/60 dark:group-hover:to-emerald-800/40';
    if (variant === 'destructive') return 'from-rose-50 to-rose-100/50 dark:from-rose-950/50 dark:to-rose-900/30 group-hover:from-rose-100 group-hover:to-rose-50 dark:group-hover:from-rose-900/60 dark:group-hover:to-rose-800/40';
    return 'from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 group-hover:from-blue-100 group-hover:to-blue-50 dark:group-hover:from-blue-900/60 dark:group-hover:to-blue-800/40';
  };

  const getCardBorder = () => {
    if (variant === 'success') return 'border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700';
    if (variant === 'destructive') return 'border-rose-200/50 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-700';
    return 'border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700';
  };

  return (
    <Card className={`group overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${getCardBorder()} ${className || ''}`}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 transition-all">
              {value}
            </h3>
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getIconBg()} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm flex-shrink-0`}>
              <Icon className={`h-7 w-7 ${getIconColor()} transition-transform duration-300`} strokeWidth={2} />
            </div>
          </div>
          {trend && (
            <p className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
