import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';
  onClick?: () => void;
}

const colorVariants = {
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    trend: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400',
    trend: 'text-blue-600 dark:text-blue-400',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    icon: 'text-amber-600 dark:text-amber-400',
    trend: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
    trend: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    icon: 'text-purple-600 dark:text-purple-400',
    trend: 'text-purple-600 dark:text-purple-400',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    icon: 'text-slate-600 dark:text-slate-400',
    trend: 'text-slate-600 dark:text-slate-400',
  },
};

export function QuickStat({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue',
  onClick 
}: QuickStatProps) {
  const colors = colorVariants[color];
  
  return (
    <Card 
      className={cn(
        "relative overflow-hidden",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {value}
            </p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2">
                {trend && (
                  <span className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {trend.value > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : trend.value < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-muted-foreground">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            "flex items-center justify-center rounded-xl p-3",
            colors.bg
          )}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickStatsGridProps {
  stats: QuickStatProps[];
  columns?: 2 | 3 | 4;
}

export function QuickStatsGrid({ stats, columns = 4 }: QuickStatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {stats.map((stat, index) => (
        <QuickStat key={index} {...stat} />
      ))}
    </div>
  );
}
