import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={`gap-1 ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
