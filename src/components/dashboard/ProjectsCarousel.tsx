import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { FolderKanban, Clock, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AvatarInitials } from '@/components/ui/avatar-initials';

interface ProjectProgress {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  status: string;
  dueDate: string | null;
  projectType: string;
}

interface ProjectsCarouselProps {
  projects: ProjectProgress[];
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return 'bg-emerald-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-amber-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Em Andamento':
      return 'default';
    case 'Planejamento':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function ProjectsCarousel({ projects }: ProjectsCarouselProps) {
  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum projeto ativo no momento
          </p>
          <Link 
            to="/projetos"
            className="text-sm text-primary hover:underline mt-2"
          >
            Criar novo projeto
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Projetos Ativos</h2>
            <p className="text-xs text-muted-foreground">
              {projects.length} projeto{projects.length !== 1 ? 's' : ''} em andamento
            </p>
          </div>
        </div>
        <Link 
          to="/projetos"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {projects.map((project) => (
            <CarouselItem 
              key={project.id} 
              className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
            >
              <Link to={`/projetos/${project.id}`} className="block h-full">
                <Card className={cn(
                  "h-full transition-all duration-200",
                  "hover:shadow-lg hover:border-primary/20 cursor-pointer",
                  "group"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs shrink-0"
                      >
                        {project.projectType}
                      </Badge>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="pt-2">
                      <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <AvatarInitials 
                          name={project.clientName} 
                          size="xs"
                        />
                        <span className="text-sm text-muted-foreground truncate">
                          {project.clientName}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold">{project.progress}%</span>
                      </div>
                      <Progress 
                        value={project.progress} 
                        className="h-2"
                        indicatorClassName={getProgressColor(project.progress)}
                      />
                    </div>

                    {/* Due date */}
                    {project.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Prazo: {format(new Date(project.dueDate), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <div className="flex justify-end gap-2 mt-4">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
}
