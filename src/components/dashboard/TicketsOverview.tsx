import { Button } from '@/components/ui/button';
import { ArrowRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TicketStats {
  waiting: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface TicketsOverviewProps {
  stats: TicketStats;
}

export function TicketsOverview({ stats }: TicketsOverviewProps) {
  const navigate = useNavigate();
  const total = stats.waiting + stats.inProgress + stats.resolved + stats.closed;

  const items = [
    { label: 'Aguardando', value: stats.waiting },
    { label: 'Em Atendimento', value: stats.inProgress },
    { label: 'Resolvido', value: stats.resolved },
    { label: 'Concluído', value: stats.closed },
  ];

  return (
    <div className="h-full rounded-xl border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">Tickets</span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => navigate('/tickets?new=true')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Novo
          </Button>
        </div>
      </div>

      {/* Total */}
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] text-muted-foreground mb-1">Total de tickets</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{total}</p>
      </div>

      {/* Items */}
      <div className="border-t flex-1 min-h-0">
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
      <div className="border-t px-6 py-3 mt-auto">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
