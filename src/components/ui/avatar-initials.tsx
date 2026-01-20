import { getAvatarColor, getInitials } from '@/lib/avatarColors';
import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function AvatarInitials({ name, size = 'md', className }: AvatarInitialsProps) {
  const { bg, text } = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {initials}
    </div>
  );
}
