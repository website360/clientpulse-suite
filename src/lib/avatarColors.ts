// Avatar color system for consistent client/user identification
export const avatarColors = [
  { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
  { bg: '#84CC16', text: '#FFFFFF' }, // Lime
  { bg: '#F97316', text: '#FFFFFF' }, // Orange
  { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
];

// Get consistent color based on string (name or id)
export function getAvatarColor(identifier: string): { bg: string; text: string } {
  if (!identifier) return avatarColors[0];
  
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return '??';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Service/category badge colors
export const serviceBadgeColors: Record<string, { bg: string; text: string }> = {
  'social_media': { bg: '#3B82F6', text: '#FFFFFF' },
  'seo': { bg: '#10B981', text: '#FFFFFF' },
  'ppc': { bg: '#8B5CF6', text: '#FFFFFF' },
  'content': { bg: '#F59E0B', text: '#FFFFFF' },
  'branding': { bg: '#F43F5E', text: '#FFFFFF' },
  'web_design': { bg: '#06B6D4', text: '#FFFFFF' },
  'consulting': { bg: '#6366F1', text: '#FFFFFF' },
  'default': { bg: '#64748B', text: '#FFFFFF' },
};

// Status colors
export const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  'active': { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  'inactive': { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  'paused': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  'overdue': { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  'pending': { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
};
