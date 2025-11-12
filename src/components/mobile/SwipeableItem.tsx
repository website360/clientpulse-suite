import { ReactNode, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function SwipeableItem({ children, onDelete, onEdit, className }: SwipeableItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const maxSwipe = 80;
  const deleteThreshold = 60;

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!onDelete && !onEdit) return;
      
      setIsSwiping(true);
      const offset = Math.max(-maxSwipe, Math.min(0, eventData.deltaX));
      setSwipeOffset(offset);
    },
    onSwiped: () => {
      setIsSwiping(false);
      
      if (Math.abs(swipeOffset) >= deleteThreshold && onDelete) {
        onDelete();
      }
      
      setSwipeOffset(0);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  if (!onDelete && !onEdit) {
    return <div className={className}>{children}</div>;
  }

  const showDelete = Math.abs(swipeOffset) > 20;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Delete background */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 flex items-center justify-end px-6',
          'bg-destructive text-destructive-foreground transition-all',
          showDelete ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: Math.abs(swipeOffset) }}
      >
        <Trash2 className="h-5 w-5" />
      </div>

      {/* Swipeable content */}
      <div
        {...handlers}
        className={cn(
          'relative bg-card transition-transform touch-pan-y',
          isSwiping ? 'duration-0' : 'duration-300'
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
