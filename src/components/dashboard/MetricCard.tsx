import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const getVariantClasses = () => {
    if (variant === 'success') {
      return 'border-success/20 bg-success/5';
    }
    if (variant === 'destructive') {
      return 'border-destructive/20 bg-destructive/5';
    }
    return 'border-border bg-card';
  };

  const getIconClasses = () => {
    if (variant === 'success') {
      return 'text-success';
    }
    if (variant === 'destructive') {
      return 'text-destructive';
    }
    return 'text-primary';
  };

  return (
    <Card className={`${getVariantClasses()} ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${getIconClasses()}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
