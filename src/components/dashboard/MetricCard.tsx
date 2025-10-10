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
    if (variant === 'success') return 'text-success';
    if (variant === 'destructive') return 'text-destructive';
    return 'text-primary';
  };

  const getIconBg = () => {
    if (variant === 'success') return 'from-success/10 to-success/5 group-hover:from-success/20 group-hover:to-success/10';
    if (variant === 'destructive') return 'from-destructive/10 to-destructive/5 group-hover:from-destructive/20 group-hover:to-destructive/10';
    return 'from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10';
  };

  return (
    <Card className={`kpi-card hover-scale group ${className || ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-foreground transition-all group-hover:text-primary">
              {value}
            </h3>
            {trend && (
              <p className={`text-sm mt-2 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getIconBg()} flex items-center justify-center transition-all group-hover:shadow-lg`}>
            <Icon className={`h-6 w-6 ${getIconColor()} transition-transform group-hover:scale-110`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
