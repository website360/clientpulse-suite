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

interface QuickStatsGridProps {
  stats: QuickStatProps[];
  columns?: 2 | 3 | 4;
}

export function QuickStatsGrid({ stats }: QuickStatsGridProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={cn(
              "px-6 py-5 transition-colors",
              stat.onClick && "cursor-pointer hover:bg-muted/20"
            )}
            onClick={stat.onClick}
          >
            <p className="text-[11px] text-muted-foreground mb-1">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground leading-none">
              {stat.value}
            </p>
            {(stat.subtitle || stat.trend) && (
              <div className="flex items-center gap-2 mt-2">
                {stat.trend && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    stat.trend.value > 0 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : stat.trend.value < 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-muted-foreground"
                  )}>
                    {stat.trend.value > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : stat.trend.value < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                    {stat.trend.value > 0 ? '+' : ''}{stat.trend.value}%
                  </span>
                )}
                {stat.subtitle && (
                  <span className="text-[11px] text-muted-foreground">
                    {stat.subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
