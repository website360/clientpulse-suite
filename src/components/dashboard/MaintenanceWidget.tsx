import { ArrowRight } from 'lucide-react';
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
    { label: 'Realizadas', value: stats.done },
    { label: 'Aguardando', value: stats.pending },
    { label: 'Atrasadas', value: stats.overdue },
  ];

  return (
    <div className="h-full rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">Manutenções</span>
      </div>

      {/* Total + completion */}
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] text-muted-foreground mb-1">Taxa de conclusão</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{completionRate}%</p>
        <p className="text-[11px] text-muted-foreground mt-1">{total} manutenções no total</p>
      </div>

      {/* Items */}
      <div className="border-t">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center justify-between px-6 py-3.5",
              index < items.length - 1 && "border-b"
            )}
          >
            <span className="text-[13px] text-muted-foreground">{item.label}</span>
            <span className="text-[15px] font-semibold tabular-nums text-foreground">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3">
        <Link
          to="/manutencoes"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
