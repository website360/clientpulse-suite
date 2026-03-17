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
  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'destructive':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'info':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const iconColor = getIconColor();

  return (
    <Card 
      className={cn(
        "group border shadow-sm hover:shadow-md transition-all duration-200",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              {title}
            </p>
            <h3 className="text-2xl font-bold tracking-tight leading-none text-foreground">
              {value}
            </h3>
            {subtitle && (
              <p className="text-[11px] font-medium text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1",
                trend.isPositive 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                  : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.value}</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted/60">
            <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
