import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { FolderKanban, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

export function ProjectsCarousel({ projects }: ProjectsCarouselProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card flex flex-col items-center justify-center py-12">
        <FolderKanban className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-[13px] text-muted-foreground">Nenhum projeto ativo</p>
        <Link to="/projetos" className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
          Criar novo projeto
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">Projetos Ativos</span>
        <span className="text-[13px] text-muted-foreground">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Carousel */}
      <div className="px-6 py-5 flex-1 min-h-0">
        <Carousel className="w-full">
          <CarouselContent className="-ml-3">
            {projects.map((project) => (
              <CarouselItem key={project.id} className="pl-3 md:basis-1/2 lg:basis-1/3">
                <Link to={`/projetos/${project.id}`} className="block h-full">
                  <div className="h-full rounded-lg border p-4 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] text-muted-foreground">{project.projectType}</span>
                      <span className="text-[11px] text-muted-foreground">{project.status}</span>
                    </div>

                    <p className="text-[13px] font-semibold text-foreground line-clamp-1">{project.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{project.clientName}</p>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-muted-foreground">Progresso</span>
                      <span className="text-[13px] font-semibold tabular-nums">{project.progress}%</span>
                    </div>

                    {project.dueDate && (
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(project.dueDate), "dd MMM yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-end gap-2 mt-4">
            <CarouselPrevious className="static translate-y-0 h-7 w-7" />
            <CarouselNext className="static translate-y-0 h-7 w-7" />
          </div>
        </Carousel>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 mt-auto">
        <Link to="/projetos" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
