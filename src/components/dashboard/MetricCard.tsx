import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'info';
  className?: string;
  onClick?: () => void;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className, 
  variant = 'default', 
  onClick,
  subtitle 
}: MetricCardProps) {
  const getIconStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          icon: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'destructive':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/20',
          icon: 'text-rose-600 dark:text-rose-400'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          icon: 'text-amber-600 dark:text-amber-400'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          icon: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          bg: 'bg-primary/10 dark:bg-primary/20',
          icon: 'text-primary'
        };
    }
  };

  const styles = getIconStyles();

  return (
    <Card 
      className={cn(
        "group overflow-hidden border bg-card transition-all duration-300",
        "hover:shadow-lg hover:border-primary/20",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Content */}
          <div className="space-y-1 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-2xl font-bold text-foreground">
              {value}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium mt-2",
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>{trend.value}</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
            "transition-all duration-300 group-hover:scale-110",
            styles.bg
          )}>
            <Icon className={cn("h-6 w-6", styles.icon)} strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
