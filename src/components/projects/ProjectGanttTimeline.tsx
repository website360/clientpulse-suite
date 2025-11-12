import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, differenceInDays, addDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectGanttTimelineProps {
  projectId: string;
}

interface Stage {
  id: string;
  name: string;
  started_at: string | null;
  completed_at: string | null;
  order: number;
  status: string;
}

export function ProjectGanttTimeline({ projectId }: ProjectGanttTimelineProps) {
  const { data: stages, isLoading } = useQuery({
    queryKey: ['project-stages-timeline', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stages')
        .select('id, name, started_at, completed_at, order, status')
        .eq('project_id', projectId)
        .order('order');
      
      if (error) throw error;
      return data as Stage[];
    },
  });

  if (isLoading) return <div>Carregando timeline...</div>;
  if (!stages || stages.length === 0) return null;

  // Calcular datas min e max do projeto
  const allDates = stages
    .flatMap(s => [s.started_at, s.completed_at])
    .filter(Boolean) as string[];
  
  if (allDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma etapa iniciada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
  const today = new Date();
  
  // Se ainda está em andamento, estender até hoje
  const endDate = maxDate < today ? today : maxDate;
  const totalDays = differenceInDays(endDate, minDate) + 1;

  const getStagePosition = (stage: Stage) => {
    if (!stage.started_at) return null;
    
    const start = new Date(stage.started_at);
    const end = stage.completed_at ? new Date(stage.completed_at) : today;
    
    const startOffset = differenceInDays(start, minDate);
    const duration = differenceInDays(end, start) + 1;
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-500';
      case 'em_andamento':
        return 'bg-blue-500';
      case 'pendente':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStageLabel = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'em_andamento':
        return 'Em Andamento';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Gerar marcadores de meses
  const generateMonthMarkers = () => {
    const markers = [];
    let currentDate = new Date(minDate);
    
    while (currentDate <= endDate) {
      const position = (differenceInDays(currentDate, minDate) / totalDays) * 100;
      markers.push({
        date: currentDate,
        position: `${position}%`,
      });
      currentDate = addDays(currentDate, 30); // Aproximadamente 1 mês
    }
    
    return markers;
  };

  const monthMarkers = generateMonthMarkers();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timeline do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Marcadores de tempo */}
          <div className="relative h-8 border-b border-border">
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: marker.position }}
              >
                <div className="w-px h-2 bg-border" />
                <span className="text-xs text-muted-foreground mt-1">
                  {format(marker.date, 'MMM/yy', { locale: ptBR })}
                </span>
              </div>
            ))}
            
            {/* Marcador "Hoje" */}
            {isWithinInterval(today, { start: minDate, end: endDate }) && (
              <div
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{
                  left: `${(differenceInDays(today, minDate) / totalDays) * 100}%`,
                }}
              >
                <div className="w-0.5 h-full bg-red-500" />
                <span className="text-xs text-red-500 font-medium mt-1">Hoje</span>
              </div>
            )}
          </div>

          {/* Barras das etapas */}
          <div className="space-y-3">
            {stages.map((stage) => {
              const position = getStagePosition(stage);
              
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getStageLabel(stage.status)}
                    </span>
                  </div>
                  <div className="relative h-8 bg-muted rounded-lg">
                    {position && (
                      <div
                        className={`absolute top-1 bottom-1 rounded ${getStageColor(stage.status)} flex items-center px-2`}
                        style={{
                          left: position.left,
                          width: position.width,
                        }}
                      >
                        <span className="text-xs text-white font-medium truncate">
                          {stage.started_at && format(new Date(stage.started_at), 'dd/MM', { locale: ptBR })}
                          {stage.completed_at && ` - ${format(new Date(stage.completed_at), 'dd/MM', { locale: ptBR })}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs pt-2 border-t">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Em Andamento</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Concluída</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}