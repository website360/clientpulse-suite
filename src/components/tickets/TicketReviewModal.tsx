import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

interface TicketReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
}

export function TicketReviewModal({ open, onOpenChange, onSubmit }: TicketReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    try {
      await onSubmit(rating, feedback);
      onOpenChange(false);
      setRating(0);
      setFeedback('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Avaliar Atendimento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Avalie o atendimento recebido e ajude-nos a melhorar
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Como você avalia o atendimento recebido?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Observações (opcional)
            </label>
            <Textarea
              placeholder="Compartilhe sua experiência..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? 'Enviando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
