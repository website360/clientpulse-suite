import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'destructive';
  className?: string;
  onClick?: () => void;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function MetricCard({ title, value, icon: Icon, trend, className, variant = 'default', onClick }: MetricCardProps) {
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

  return (
    <Card 
      className={cn(
        "group overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer hover:border-primary/50 active:scale-95",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 transition-all">
              {value}
            </h3>
            <div className={`icon-wrapper h-12 w-12 rounded-2xl bg-gradient-to-br ${getIconBg()} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm flex-shrink-0`}>
              <Icon className={`lucide h-6 w-6 ${getIconColor()} transition-transform duration-300`} strokeWidth={2} />
            </div>
          </div>
          {trend && (
            <p className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
