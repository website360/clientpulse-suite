import { getAvatarColor, getInitials } from '@/lib/avatarColors';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AvatarInitialsProps {
  name: string;
  avatarUrl?: string | null;
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

export function AvatarInitials({ name, avatarUrl, size = 'md', className }: AvatarInitialsProps) {
  const { bg, text } = getAvatarColor(name);
  const initials = getInitials(name);
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageError(true)}
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          sizeClasses[size],
          className
        )}
      />
    );
  }

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
