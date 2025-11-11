import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketSLABadgeProps {
  slaTracking?: {
    first_response_due_at?: string;
    first_response_at?: string;
    first_response_breached?: boolean;
    resolution_due_at?: string;
    resolution_at?: string;
    resolution_breached?: boolean;
  };
  status: string;
}

export function TicketSLABadge({ slaTracking, status }: TicketSLABadgeProps) {
  if (!slaTracking) return null;

  const now = new Date();
  
  // Se já foi resolvido/fechado
  if (status === 'resolved' || status === 'closed') {
    if (slaTracking.resolution_breached) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          SLA Estourado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        <CheckCircle className="h-3 w-3" />
        SLA OK
      </Badge>
    );
  }

  // Verificar primeira resposta
  if (!slaTracking.first_response_at && slaTracking.first_response_due_at) {
    const dueDate = new Date(slaTracking.first_response_due_at);
    const isOverdue = dueDate < now;
    const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (60 * 1000));
    const isUrgent = minutesUntilDue <= 60 && minutesUntilDue > 0;

    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Primeira Resposta Atrasada
        </Badge>
      );
    }

    if (isUrgent) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <Clock className="h-3 w-3" />
          Responder em {minutesUntilDue}min
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Responder até {formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}
      </Badge>
    );
  }

  // Verificar resolução
  if (!slaTracking.resolution_at && slaTracking.resolution_due_at) {
    const dueDate = new Date(slaTracking.resolution_due_at);
    const isOverdue = dueDate < now;
    const hoursUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (60 * 60 * 1000));
    const isUrgent = hoursUntilDue <= 4 && hoursUntilDue > 0;

    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          SLA de Resolução Atrasado
        </Badge>
      );
    }

    if (isUrgent) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <Clock className="h-3 w-3" />
          Resolver em {hoursUntilDue}h
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Resolver até {formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}
      </Badge>
    );
  }

  return null;
}