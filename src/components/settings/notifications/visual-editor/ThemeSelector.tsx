import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EMAIL_THEMES, EmailTheme } from './themes';

interface ThemeSelectorProps {
  selectedThemeId: string;
  onThemeChange: (theme: EmailTheme) => void;
}

export function ThemeSelector({ selectedThemeId, onThemeChange }: ThemeSelectorProps) {
  const selectedTheme = EMAIL_THEMES.find((t) => t.id === selectedThemeId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="h-4 w-4 mr-2" />
          Tema: {selectedTheme?.name || 'Moderno'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Selecionar Tema</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Aplica cores e estilos em todos os blocos
          </p>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {EMAIL_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedThemeId === theme.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-accent border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{theme.name}</span>
                      {selectedThemeId === theme.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {theme.description}
                    </p>
                  </div>
                </div>
                
                {/* Color Preview */}
                <div className="flex gap-1 mt-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Primary"
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: theme.colors.secondary }}
                    title="Secondary"
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: theme.colors.accent }}
                    title="Accent"
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: theme.colors.muted }}
                    title="Muted"
                  />
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
