import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocumentPreviewProps {
  template: {
    page_count: number;
    page_layouts: Array<{
      page_number: number;
      background_url?: string;
      content_margin_top?: number;
      content_margin_bottom?: number;
    }>;
    header_image_url?: string;
    footer_image_url?: string;
    watermark_url?: string;
    template_html: string;
    styles?: string;
    paper_size: string;
    orientation: string;
  };
  variablesData?: Record<string, string>;
}

export function DocumentPreview({ template, variablesData = {} }: DocumentPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showGuides, setShowGuides] = useState(true);

  const replaceVariables = (html: string): string => {
    let result = html;
    Object.entries(variablesData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || `[${key}]`);
    });
    return result;
  };

  const currentLayout = template.page_layouts?.find(
    (layout) => layout.page_number === currentPage
  );

  const paperSizes = {
    A4: { width: 210, height: 297 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 },
  };

  const size = paperSizes[template.paper_size as keyof typeof paperSizes] || paperSizes.A4;
  const isLandscape = template.orientation === 'landscape';
  const width = isLandscape ? size.height : size.width;
  const height = isLandscape ? size.width : size.height;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preview do Documento</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuides(!showGuides)}
            >
              {showGuides ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showGuides ? 'Ocultar' : 'Mostrar'} Guias
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Navigation */}
          {template.page_count > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Página {currentPage} de {template.page_count}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(template.page_count, currentPage + 1))}
                disabled={currentPage === template.page_count}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Preview Area */}
          <ScrollArea className="h-[600px] border rounded-lg bg-muted/20">
            <div className="flex justify-center p-8">
              <div
                className="bg-white shadow-xl relative"
                style={{
                  width: `${width * 2}mm`,
                  minHeight: `${height * 2}mm`,
                  aspectRatio: `${width} / ${height}`,
                }}
              >
                {/* Background Image */}
                {currentLayout?.background_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentLayout.background_url})` }}
                  />
                )}

                {/* Watermark */}
                {template.watermark_url && (
                  <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-10 pointer-events-none"
                    style={{ backgroundImage: `url(${template.watermark_url})` }}
                  />
                )}

                {/* Header */}
                {template.header_image_url && (
                  <div className="relative">
                    <img
                      src={template.header_image_url}
                      alt="Header"
                      className="w-full h-auto"
                    />
                    {showGuides && (
                      <div className="absolute inset-0 border-b-2 border-dashed border-blue-500" />
                    )}
                  </div>
                )}

                {/* Content Area */}
                <div
                  className="relative p-8"
                  style={{
                    marginTop: currentLayout?.content_margin_top || 0,
                    marginBottom: currentLayout?.content_margin_bottom || 0,
                  }}
                >
                  {showGuides && (
                    <div className="absolute inset-0 border-2 border-dashed border-green-500 pointer-events-none" />
                  )}
                  
                  <style dangerouslySetInnerHTML={{ __html: template.styles || '' }} />
                  
                  <div
                    dangerouslySetInnerHTML={{
                      __html: replaceVariables(template.template_html),
                    }}
                  />
                </div>

                {/* Footer */}
                {template.footer_image_url && (
                  <div className="relative mt-auto">
                    {showGuides && (
                      <div className="absolute inset-0 border-t-2 border-dashed border-blue-500" />
                    )}
                    <img
                      src={template.footer_image_url}
                      alt="Footer"
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              Tamanho: {template.paper_size} ({width}mm × {height}mm)
            </p>
            <p>
              Orientação: {template.orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
