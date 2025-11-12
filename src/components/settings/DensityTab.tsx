import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDensity, DensityMode } from '@/contexts/DensityContext';
import { Maximize2, Square, Minimize2 } from 'lucide-react';

export function DensityTab() {
  const { density, setDensity } = useDensity();

  const densityOptions = [
    {
      value: 'compact' as DensityMode,
      label: 'Compacto',
      description: 'Máximo de informação, espaçamento reduzido',
      icon: Minimize2,
    },
    {
      value: 'normal' as DensityMode,
      label: 'Normal',
      description: 'Equilíbrio entre informação e conforto visual',
      icon: Square,
    },
    {
      value: 'comfortable' as DensityMode,
      label: 'Confortável',
      description: 'Maior espaçamento, interface mais respirável',
      icon: Maximize2,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Densidade da Interface</CardTitle>
          <CardDescription>
            Ajuste o espaçamento e tamanho dos elementos para sua preferência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={density} onValueChange={(value) => setDensity(value as DensityMode)}>
            <div className="space-y-4">
              {densityOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setDensity(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Veja como os elementos ficam com a densidade selecionada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded flex items-center px-4">
              <span className="text-sm">Botão de exemplo</span>
            </div>
            <div className="h-16 bg-muted rounded flex items-center px-4">
              <span className="text-sm">Card de exemplo com conteúdo</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
