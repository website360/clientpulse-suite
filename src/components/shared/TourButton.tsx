import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTour } from '@/hooks/useTour';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function TourButton() {
  const { startTour } = useTour();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={startTour}
            className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
          >
            <HelpCircle className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Iniciar tour guiado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
