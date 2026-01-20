import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Square, RotateCcw, Save, Eye, Check, AlertTriangle, Info, X } from 'lucide-react';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import {
  WhiteLabelSettings,
  availableFonts,
  hexToHsl,
  hslToHex,
  parseHslString,
  applyWhiteLabelSettings,
} from '@/lib/whitelabel';

export function WhiteLabelTab() {
  const { settings, isLoading, updateSettings, resetToDefaults, isUpdating, isResetting } = useWhiteLabel();
  
  // Local state for form values
  const [localSettings, setLocalSettings] = useState<Partial<WhiteLabelSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        primary_h: settings.primary_h,
        primary_s: settings.primary_s,
        primary_l: settings.primary_l,
        secondary_h: settings.secondary_h,
        secondary_s: settings.secondary_s,
        secondary_l: settings.secondary_l,
        success_color: settings.success_color,
        warning_color: settings.warning_color,
        error_color: settings.error_color,
        info_color: settings.info_color,
        font_family: settings.font_family,
        font_heading: settings.font_heading,
        border_radius: settings.border_radius,
        company_name: settings.company_name,
      });
    }
  }, [settings]);

  // Update local settings and mark as changed
  const updateLocalSettings = (updates: Partial<WhiteLabelSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Apply preview
  const handlePreview = () => {
    applyWhiteLabelSettings(localSettings);
  };

  // Save changes
  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  // Reset to defaults
  const handleReset = () => {
    resetToDefaults();
    setHasChanges(false);
  };

  // Convert HSL to HEX for color picker
  const getPrimaryHex = () => {
    return hslToHex(
      localSettings.primary_h || 220,
      localSettings.primary_s || 60,
      localSettings.primary_l || 25
    );
  };

  const getSecondaryHex = () => {
    return hslToHex(
      localSettings.secondary_h || 215,
      localSettings.secondary_s || 20,
      localSettings.secondary_l || 48
    );
  };

  // Handle color picker change
  const handlePrimaryColorChange = (hex: string) => {
    const hsl = hexToHsl(hex);
    updateLocalSettings({
      primary_h: hsl.h,
      primary_s: hsl.s,
      primary_l: hsl.l,
    });
  };

  const handleSecondaryColorChange = (hex: string) => {
    const hsl = hexToHsl(hex);
    updateLocalSettings({
      secondary_h: hsl.h,
      secondary_s: hsl.s,
      secondary_l: hsl.l,
    });
  };

  // Handle status color change
  const handleStatusColorChange = (field: 'success_color' | 'warning_color' | 'error_color' | 'info_color', hex: string) => {
    const hsl = hexToHsl(hex);
    updateLocalSettings({
      [field]: `${hsl.h} ${hsl.s}% ${hsl.l}%`,
    });
  };

  // Get HEX from HSL string
  const getStatusColorHex = (hslString: string) => {
    const hsl = parseHslString(hslString);
    return hslToHex(hsl.h, hsl.s, hsl.l);
  };

  // Border radius options
  const radiusOptions = [
    { value: '0', label: 'Sem arredondamento' },
    { value: '0.25rem', label: 'Mínimo' },
    { value: '0.5rem', label: 'Pequeno' },
    { value: '0.75rem', label: 'Médio (padrão)' },
    { value: '1rem', label: 'Grande' },
    { value: '1.5rem', label: 'Extra grande' },
    { value: '9999px', label: 'Totalmente arredondado' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configurações White Label
              </CardTitle>
              <CardDescription>
                Personalize as cores, fontes e aparência do sistema para sua marca
              </CardDescription>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="animate-pulse">
                Alterações não salvas
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Company Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nome da Empresa</CardTitle>
          <CardDescription>
            Nome que será exibido em diversos locais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={localSettings.company_name || ''}
            onChange={(e) => updateLocalSettings({ company_name: e.target.value })}
            placeholder="Nome da sua empresa"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Primary Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ backgroundColor: getPrimaryHex() }} 
            />
            Cor Primária
          </CardTitle>
          <CardDescription>
            Cor principal usada em botões, links e elementos de destaque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Seletor de Cor</Label>
              <input
                type="color"
                value={getPrimaryHex()}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                className="w-20 h-20 rounded-lg cursor-pointer border-2 border-border"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>H (Matiz)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.primary_h || 220]}
                      min={0}
                      max={360}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ primary_h: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.primary_h || 220}°</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>S (Saturação)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.primary_s || 60]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ primary_s: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.primary_s || 60}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>L (Luminosidade)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.primary_l || 25]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ primary_l: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.primary_l || 25}%</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-4">
                  <Button 
                    style={{ 
                      backgroundColor: getPrimaryHex(),
                      color: 'white'
                    }}
                  >
                    Botão Primário
                  </Button>
                  <span 
                    className="underline cursor-pointer"
                    style={{ color: getPrimaryHex() }}
                  >
                    Link de exemplo
                  </span>
                  <Badge style={{ backgroundColor: getPrimaryHex(), color: 'white' }}>
                    Badge
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ backgroundColor: getSecondaryHex() }} 
            />
            Cor Secundária
          </CardTitle>
          <CardDescription>
            Cor usada em elementos secundários e textos auxiliares
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Seletor de Cor</Label>
              <input
                type="color"
                value={getSecondaryHex()}
                onChange={(e) => handleSecondaryColorChange(e.target.value)}
                className="w-20 h-20 rounded-lg cursor-pointer border-2 border-border"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>H (Matiz)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.secondary_h || 215]}
                      min={0}
                      max={360}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ secondary_h: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.secondary_h || 215}°</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>S (Saturação)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.secondary_s || 20]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ secondary_s: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.secondary_s || 20}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>L (Luminosidade)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[localSettings.secondary_l || 48]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => updateLocalSettings({ secondary_l: v })}
                    />
                    <span className="text-sm w-10 text-right">{localSettings.secondary_l || 48}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cores de Status</CardTitle>
          <CardDescription>
            Cores usadas para indicar diferentes estados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Success */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Sucesso
              </Label>
              <input
                type="color"
                value={getStatusColorHex(localSettings.success_color || '160 84% 39%')}
                onChange={(e) => handleStatusColorChange('success_color', e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border-2 border-border"
              />
              <Badge 
                className="w-full justify-center"
                style={{ 
                  backgroundColor: getStatusColorHex(localSettings.success_color || '160 84% 39%'),
                  color: 'white'
                }}
              >
                Sucesso
              </Badge>
            </div>

            {/* Warning */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Alerta
              </Label>
              <input
                type="color"
                value={getStatusColorHex(localSettings.warning_color || '38 92% 50%')}
                onChange={(e) => handleStatusColorChange('warning_color', e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border-2 border-border"
              />
              <Badge 
                className="w-full justify-center"
                style={{ 
                  backgroundColor: getStatusColorHex(localSettings.warning_color || '38 92% 50%'),
                  color: 'white'
                }}
              >
                Alerta
              </Badge>
            </div>

            {/* Error */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                Erro
              </Label>
              <input
                type="color"
                value={getStatusColorHex(localSettings.error_color || '0 84% 60%')}
                onChange={(e) => handleStatusColorChange('error_color', e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border-2 border-border"
              />
              <Badge 
                className="w-full justify-center"
                style={{ 
                  backgroundColor: getStatusColorHex(localSettings.error_color || '0 84% 60%'),
                  color: 'white'
                }}
              >
                Erro
              </Badge>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Informação
              </Label>
              <input
                type="color"
                value={getStatusColorHex(localSettings.info_color || '188 94% 43%')}
                onChange={(e) => handleStatusColorChange('info_color', e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border-2 border-border"
              />
              <Badge 
                className="w-full justify-center"
                style={{ 
                  backgroundColor: getStatusColorHex(localSettings.info_color || '188 94% 43%'),
                  color: 'white'
                }}
              >
                Informação
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tipografia
          </CardTitle>
          <CardDescription>
            Selecione as fontes usadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Fonte Principal</Label>
              <Select
                value={localSettings.font_family || 'Outfit'}
                onValueChange={(v) => updateLocalSettings({ font_family: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p 
                className="text-sm text-muted-foreground p-3 bg-muted rounded-lg"
                style={{ fontFamily: localSettings.font_family || 'Outfit' }}
              >
                Este é um texto de exemplo usando a fonte selecionada. Aa Bb Cc 123
              </p>
            </div>

            <div className="space-y-3">
              <Label>Fonte de Títulos</Label>
              <Select
                value={localSettings.font_heading || 'Outfit'}
                onValueChange={(v) => updateLocalSettings({ font_heading: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <h3 
                className="text-lg font-semibold p-3 bg-muted rounded-lg"
                style={{ fontFamily: localSettings.font_heading || 'Outfit' }}
              >
                Exemplo de Título
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Square className="h-5 w-5" />
            Arredondamento de Bordas
          </CardTitle>
          <CardDescription>
            Define o estilo dos cantos de cards, botões e inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select
            value={localSettings.border_radius || '0.75rem'}
            onValueChange={(v) => updateLocalSettings({ border_radius: v })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-4">
              <div 
                className="w-24 h-16 bg-primary flex items-center justify-center text-primary-foreground text-xs"
                style={{ borderRadius: localSettings.border_radius || '0.75rem' }}
              >
                Card
              </div>
              <Button 
                variant="default"
                style={{ borderRadius: localSettings.border_radius || '0.75rem' }}
              >
                Botão
              </Button>
              <Input 
                placeholder="Input"
                className="max-w-[150px]"
                style={{ borderRadius: localSettings.border_radius || '0.75rem' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isResetting}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isResetting ? 'Restaurando...' : 'Restaurar Padrão'}
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
