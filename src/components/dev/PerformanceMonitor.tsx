import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    cacheSize: 0,
    memoryUsage: 0,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only show in development
    if (import.meta.env.PROD) return;

    const updateMetrics = () => {
      const cache = queryClient.getQueryCache();
      const cacheSize = cache.getAll().length;

      // @ts-ignore - performance.memory is not in all browsers
      const memoryUsage = performance.memory
        ? // @ts-ignore
          Math.round(performance.memory.usedJSHeapSize / 1048576)
        : 0;

      setMetrics({
        renderTime: performance.now(),
        cacheSize,
        memoryUsage,
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // Only render in development
  if (import.meta.env.PROD) return null;

  return (
    <Card className="fixed bottom-4 right-4 p-3 text-xs bg-card/95 backdrop-blur-sm shadow-lg z-50 min-w-[200px]">
      <div className="font-semibold mb-2 text-muted-foreground">Performance Monitor</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Queries Cached:</span>
          <span className="font-mono">{metrics.cacheSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Memory:</span>
          <span className="font-mono">{metrics.memoryUsage} MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Uptime:</span>
          <span className="font-mono">{Math.round(metrics.renderTime / 1000)}s</span>
        </div>
      </div>
    </Card>
  );
}
