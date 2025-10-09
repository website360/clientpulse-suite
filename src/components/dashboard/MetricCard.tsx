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
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
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
              <p className={`text-sm mt-2 ${trend.isPositive ? 'text-success' : 'text-error'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center transition-all group-hover:from-primary/20 group-hover:to-primary/10 group-hover:shadow-lg">
            <Icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
