import { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;
  const maxPull = 120;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        setCanPull(true);
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      
      if (distance > 0 && container.scrollTop === 0) {
        setPullDistance(Math.min(distance, maxPull));
        
        if (distance > threshold * 0.5) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull || isRefreshing) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      setCanPull(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, isRefreshing, pullDistance, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 360;

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center transition-all',
          'pointer-events-none z-10'
        )}
        style={{
          height: `${pullDistance}px`,
          opacity: pullProgress,
        }}
      >
        <div className="bg-card rounded-full p-2 shadow-lg">
          <RefreshCw
            className={cn('h-6 w-6 text-primary', isRefreshing && 'animate-spin')}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </div>
      
      <div style={{ paddingTop: isRefreshing ? '60px' : 0, transition: 'padding-top 0.2s' }}>
        {children}
      </div>
    </div>
  );
}
