export interface EmailTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    accent: string;
    destructive: string;
    success: string;
    warning: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    headingSize: string;
    bodySize: string;
    smallSize: string;
  };
  spacing: {
    padding: string;
    margin: string;
  };
}

export const EMAIL_THEMES: EmailTheme[] = [
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Design limpo e contemporâneo com cores vibrantes',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      border: '#e5e7eb',
      accent: '#06b6d4',
      destructive: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headingSize: '24px',
      bodySize: '14px',
      smallSize: '12px',
    },
    spacing: {
      padding: '20px',
      margin: '20px',
    },
  },
  {
    id: 'classic',
    name: 'Clássico',
    description: 'Estilo tradicional e profissional',
    colors: {
      primary: '#1e40af',
      secondary: '#7c3aed',
      background: '#ffffff',
      foreground: '#111827',
      muted: '#f9fafb',
      border: '#d1d5db',
      accent: '#0891b2',
      destructive: '#dc2626',
      success: '#059669',
      warning: '#d97706',
      info: '#1e40af',
    },
    typography: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      headingSize: '26px',
      bodySize: '15px',
      smallSize: '13px',
    },
    spacing: {
      padding: '24px',
      margin: '24px',
    },
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Design clean e focado no conteúdo',
    colors: {
      primary: '#18181b',
      secondary: '#52525b',
      background: '#ffffff',
      foreground: '#09090b',
      muted: '#fafafa',
      border: '#e4e4e7',
      accent: '#71717a',
      destructive: '#991b1b',
      success: '#15803d',
      warning: '#a16207',
      info: '#3f3f46',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, sans-serif',
      headingSize: '22px',
      bodySize: '14px',
      smallSize: '11px',
    },
    spacing: {
      padding: '16px',
      margin: '16px',
    },
  },
  {
    id: 'warm',
    name: 'Acolhedor',
    description: 'Tons quentes e amigáveis',
    colors: {
      primary: '#ea580c',
      secondary: '#dc2626',
      background: '#fffbeb',
      foreground: '#431407',
      muted: '#fef3c7',
      border: '#fbbf24',
      accent: '#f97316',
      destructive: '#dc2626',
      success: '#16a34a',
      warning: '#ea580c',
      info: '#f59e0b',
    },
    typography: {
      fontFamily: '"Poppins", -apple-system, sans-serif',
      headingSize: '24px',
      bodySize: '14px',
      smallSize: '12px',
    },
    spacing: {
      padding: '20px',
      margin: '20px',
    },
  },
  {
    id: 'cool',
    name: 'Sereno',
    description: 'Paleta fria e relaxante',
    colors: {
      primary: '#0284c7',
      secondary: '#0891b2',
      background: '#f0f9ff',
      foreground: '#0c4a6e',
      muted: '#e0f2fe',
      border: '#7dd3fc',
      accent: '#06b6d4',
      destructive: '#dc2626',
      success: '#059669',
      warning: '#ea580c',
      info: '#0284c7',
    },
    typography: {
      fontFamily: '"Roboto", -apple-system, sans-serif',
      headingSize: '24px',
      bodySize: '14px',
      smallSize: '12px',
    },
    spacing: {
      padding: '20px',
      margin: '20px',
    },
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Sofisticado e refinado',
    colors: {
      primary: '#7c3aed',
      secondary: '#a855f7',
      background: '#faf5ff',
      foreground: '#3b0764',
      muted: '#f3e8ff',
      border: '#c084fc',
      accent: '#9333ea',
      destructive: '#dc2626',
      success: '#059669',
      warning: '#d97706',
      info: '#8b5cf6',
    },
    typography: {
      fontFamily: '"Playfair Display", Georgia, serif',
      headingSize: '28px',
      bodySize: '15px',
      smallSize: '13px',
    },
    spacing: {
      padding: '24px',
      margin: '24px',
    },
  },
];

export function applyThemeToBlock(
  blockType: string,
  properties: Record<string, any>,
  theme: EmailTheme
): Record<string, any> {
  const newProperties = { ...properties };

  switch (blockType) {
    case 'header-simple':
      newProperties.bgColor = theme.colors.muted;
      newProperties.borderColor = theme.colors.primary;
      newProperties.textColor = theme.colors.foreground;
      newProperties.subtitleColor = theme.colors.secondary;
      break;

    case 'button':
      newProperties.bgColor = theme.colors.primary;
      newProperties.textColor = theme.colors.background;
      break;

    case 'text':
      newProperties.textColor = theme.colors.foreground;
      break;

    case 'info-box':
      newProperties.bgColor = theme.colors.info + '20'; // 20% opacity
      newProperties.borderColor = theme.colors.info;
      newProperties.textColor = theme.colors.foreground;
      break;

    case 'divider':
      newProperties.color = theme.colors.border;
      break;

    case 'footer':
      newProperties.bgColor = theme.colors.muted;
      newProperties.borderColor = theme.colors.border;
      newProperties.textColor = theme.colors.secondary;
      newProperties.subtextColor = theme.colors.secondary + '99'; // 60% opacity
      break;
  }

  return newProperties;
}
