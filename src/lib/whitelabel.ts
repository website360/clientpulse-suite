// White Label utility functions

export interface WhiteLabelSettings {
  id: string;
  primary_h: number;
  primary_s: number;
  primary_l: number;
  secondary_h: number;
  secondary_s: number;
  secondary_l: number;
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  background_light: string;
  background_dark: string;
  font_family: string;
  font_heading: string;
  border_radius: string;
  company_name: string;
}

export const defaultSettings: Omit<WhiteLabelSettings, 'id'> = {
  primary_h: 220,
  primary_s: 60,
  primary_l: 25,
  secondary_h: 215,
  secondary_s: 20,
  secondary_l: 48,
  success_color: '160 84% 39%',
  warning_color: '38 92% 50%',
  error_color: '0 84% 60%',
  info_color: '188 94% 43%',
  background_light: '0 0% 100%',
  background_dark: '0 0% 13%',
  font_family: 'Outfit',
  font_heading: 'Outfit',
  border_radius: '0.75rem',
  company_name: 'Minha Empresa',
};

// Available Google Fonts
export const availableFonts = [
  'Outfit',
  'Inter',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Nunito',
  'Raleway',
  'Source Sans Pro',
  'Ubuntu',
  'Playfair Display',
  'Merriweather',
  'DM Sans',
  'Space Grotesk',
];

// Convert HEX to HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse r, g, b
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to HEX
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Parse HSL string (e.g., "220 60% 25%") to object
export function parseHslString(hslString: string): { h: number; s: number; l: number } {
  const parts = hslString.split(' ');
  return {
    h: parseInt(parts[0]) || 0,
    s: parseInt(parts[1]) || 0,
    l: parseInt(parts[2]) || 0,
  };
}

// Format HSL object to string
export function formatHslString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

// Load Google Font dynamically
export function loadGoogleFont(fontFamily: string): void {
  const fontName = fontFamily.replace(/ /g, '+');
  const linkId = `google-font-${fontName}`;
  
  // Check if font is already loaded
  if (document.getElementById(linkId)) return;
  
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// Apply white label settings to CSS variables
export function applyWhiteLabelSettings(settings: Partial<WhiteLabelSettings>): void {
  const root = document.documentElement;
  
  // Primary colors
  if (settings.primary_h !== undefined && settings.primary_s !== undefined && settings.primary_l !== undefined) {
    const primaryHsl = formatHslString(settings.primary_h, settings.primary_s, settings.primary_l);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--sidebar-primary', primaryHsl);
    root.style.setProperty('--sidebar-accent', primaryHsl);
    root.style.setProperty('--ring', primaryHsl);
    
    // Light variant (hover)
    const lightHsl = formatHslString(settings.primary_h, Math.max(settings.primary_s - 5, 0), Math.min(settings.primary_l + 10, 100));
    root.style.setProperty('--primary-light', lightHsl);
    
    // Dark variant (selected)
    const darkHsl = formatHslString(settings.primary_h, Math.min(settings.primary_s + 5, 100), Math.max(settings.primary_l - 7, 0));
    root.style.setProperty('--primary-dark', darkHsl);
  }
  
  // Secondary colors
  if (settings.secondary_h !== undefined && settings.secondary_s !== undefined && settings.secondary_l !== undefined) {
    const secondaryHsl = formatHslString(settings.secondary_h, settings.secondary_s, settings.secondary_l);
    root.style.setProperty('--secondary', secondaryHsl);
    
    const secondaryLightHsl = formatHslString(settings.secondary_h, settings.secondary_s + 4, settings.secondary_l + 10);
    root.style.setProperty('--secondary-light', secondaryLightHsl);
  }
  
  // Status colors
  if (settings.success_color) {
    root.style.setProperty('--success', settings.success_color);
  }
  if (settings.warning_color) {
    root.style.setProperty('--warning', settings.warning_color);
  }
  if (settings.error_color) {
    root.style.setProperty('--error', settings.error_color);
    root.style.setProperty('--destructive', settings.error_color);
  }
  if (settings.info_color) {
    root.style.setProperty('--info', settings.info_color);
  }
  
  // Border radius
  if (settings.border_radius) {
    root.style.setProperty('--radius', settings.border_radius);
  }
  
  // Fonts
  if (settings.font_family) {
    loadGoogleFont(settings.font_family);
    root.style.setProperty('--font-sans', `'${settings.font_family}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`);
    document.body.style.fontFamily = `'${settings.font_family}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  }
  
  if (settings.font_heading) {
    loadGoogleFont(settings.font_heading);
    // Apply heading font to h1-h6
    const style = document.getElementById('whitelabel-heading-style') || document.createElement('style');
    style.id = 'whitelabel-heading-style';
    style.textContent = `
      h1, h2, h3, h4, h5, h6 {
        font-family: '${settings.font_heading}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }
    `;
    if (!document.getElementById('whitelabel-heading-style')) {
      document.head.appendChild(style);
    }
  }
}

// Save settings to localStorage for fast initial load
export function saveSettingsToLocalStorage(settings: WhiteLabelSettings): void {
  localStorage.setItem('whitelabel_settings', JSON.stringify(settings));
}

// Load settings from localStorage
export function loadSettingsFromLocalStorage(): WhiteLabelSettings | null {
  const stored = localStorage.getItem('whitelabel_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}
