import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Clock, Play, CheckCircle, XCircle, ArrowRight, Plus } from 'lucide-react';
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
  const activeRate = total > 0 
    ? Math.round(((stats.waiting + stats.inProgress) / total) * 100) 
    : 0;

  const items = [
    {
      label: 'Aguardando',
      value: stats.waiting,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      ring: 'ring-blue-500/20',
    },
    {
      label: 'Em Atendimento',
      value: stats.inProgress,
      icon: Play,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
      ring: 'ring-purple-500/20',
    },
    {
      label: 'Resolvido',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'Concluído',
      value: stats.closed,
      icon: XCircle,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-500/10',
      ring: 'ring-slate-500/20',
    },
  ];

  return (
    <Card className="border-border/50 transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-violet-500/10 p-2">
              <Ticket className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Tickets</CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeRate}% ativos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/tickets?new=true')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
            <Link to="/tickets">
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div 
              key={item.label}
              className={cn(
                "relative flex flex-col items-center rounded-xl p-4",
                "border border-transparent",
                "hover:border-border transition-colors",
                item.bg
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-full p-2 mb-2",
                "ring-4",
                item.ring
              )}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
              <span className="text-2xl font-bold">{item.value}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
