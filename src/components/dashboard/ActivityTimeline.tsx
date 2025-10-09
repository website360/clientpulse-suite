import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, CheckCircle, UserPlus } from 'lucide-react';

interface Activity {
  id: string;
  type: 'message' | 'status_change' | 'ticket_created' | 'client_added';
  description: string;
  user: string;
  timestamp: string;
  ticketNumber?: string;
  status?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4" />;
      case 'ticket_created':
        return <Clock className="h-4 w-4" />;
      case 'client_added':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: Activity['type']) => {
    switch (type) {
      case 'message':
        return 'text-primary';
      case 'status_change':
        return 'text-success';
      case 'ticket_created':
        return 'text-warning';
      case 'client_added':
        return 'text-info';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              Nenhuma atividade recente
            </p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 items-start">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${getIconColor(activity.type)} bg-primary/10`}>
                    {getIcon(activity.type)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{activity.user}</p>
                    {activity.ticketNumber && (
                      <Badge variant="outline" className="text-xs">
                        #{activity.ticketNumber}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
