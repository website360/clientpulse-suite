import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MaintenanceStats {
  done: number;
  pending: number;
  overdue: number;
}

interface MaintenanceWidgetProps {
  stats: MaintenanceStats;
}

export function MaintenanceWidget({ stats }: MaintenanceWidgetProps) {
  const total = stats.done + stats.pending + stats.overdue;
  const completionRate = total > 0 ? Math.round((stats.done / total) * 100) : 0;

  const items = [
    {
      label: 'Realizadas',
      value: stats.done,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Aguardando',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Atrasadas',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <Card className="h-full border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-cyan-500/10 p-2">
              <Wrench className="h-5 w-5 text-cyan-600" />
            </div>
            <CardTitle className="text-base font-semibold">Manutenções</CardTitle>
          </div>
          <Link to="/manutencoes">
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Completion Rate Ring */}
        <div className="flex items-center justify-center py-4">
          <div className="relative">
            <svg className="h-28 w-28 -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={301.6}
                strokeDashoffset={301.6 - (301.6 * completionRate) / 100}
                className="text-cyan-500 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-2xl font-bold leading-none">{completionRate}%</span>
              <span className="text-xs text-muted-foreground leading-none">Concluído</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div 
              key={item.label}
              className={cn(
                "flex flex-col items-center rounded-lg p-3",
                item.bg
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", item.color)} />
              <span className="text-lg font-bold">{item.value}</span>
              <span className="text-xs text-muted-foreground text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
