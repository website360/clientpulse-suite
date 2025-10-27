import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function AppearanceTab() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'favicon' | 'logo-light' | 'logo-dark' | 'logo-icon-light' | 'logo-icon-dark' | 'auth-logo-light' | 'auth-logo-dark' | 'kb-logo-light' | 'kb-article-logo',
    onUploadComplete?: (url: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas arquivos de imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      toast({
        title: 'Enviando imagem...',
        description: 'Por favor, aguarde.',
      });

      // Usar upload do branding helper com nome fixo
      const { uploadBrandingFile } = await import('@/lib/branding');
      const result = await uploadBrandingFile(type, file);

      if (result.error) {
        throw new Error(result.error);
      }

      // Atualizar preview imediatamente
      if (onUploadComplete) {
        onUploadComplete(result.url);
      }
      
      // Disparar evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { type, url: result.url } }));
      
      // Atualizar favicon dinamicamente se necessário
      if (type === 'favicon') {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.setAttribute('rel', 'icon');
        link.setAttribute('href', result.url);
        link.setAttribute('type', 'image/png');
        if (!document.querySelector("link[rel*='icon']")) {
          document.head.appendChild(link);
        }
      }
      
      toast({
        title: 'Imagem enviada!',
        description: 'A imagem foi atualizada com sucesso e será mantida permanentemente.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao enviar imagem',
        description: 'Não foi possível enviar a imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const LogoUploadSection = ({
    id,
    label,
    description,
    type,
  }: {
    id: string;
    label: string;
    description: string;
    type: 'favicon' | 'logo-light' | 'logo-dark' | 'logo-icon-light' | 'logo-icon-dark' | 'auth-logo-light' | 'auth-logo-dark' | 'kb-logo-light' | 'kb-article-logo';
  }) => {
    const [preview, setPreview] = useState<string>('');

    useEffect(() => {
      // Carregar preview do Storage (fonte principal) ou localStorage (cache)
      const loadPreview = async () => {
        const { getBrandingPublicUrl } = await import('@/lib/branding');
        
        // Tentar do localStorage primeiro (cache rápido)
        const cached = localStorage.getItem(`app-${type}`);
        if (cached) {
          setPreview(cached);
        }
        
        // Buscar do Storage para verificar se há versão mais recente
        try {
          const url = getBrandingPublicUrl(type, true);
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            setPreview(url);
            localStorage.setItem(`app-${type}`, url);
          }
        } catch (error) {
          // Se falhar, mantém o cache ou vazio
        }
      };
      
      loadPreview();

      // Listener para atualizações de logo
      const handleLogoUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.type === type) {
          setPreview(customEvent.detail.url);
        }
      };

      window.addEventListener('logoUpdated', handleLogoUpdate);
      return () => window.removeEventListener('logoUpdated', handleLogoUpdate);
    }, [type]);

    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        {preview && (
          <div className="rounded-md border p-4 bg-muted/30">
            <img 
              src={preview} 
              alt={label}
              className="max-h-16 w-auto object-contain mx-auto"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, type, (url) => setPreview(url))}
            className="cursor-pointer"
          />
          <Button variant="outline" size="sm" asChild>
            <label htmlFor={id} className="cursor-pointer">
              <ImageIcon className="h-4 w-4 mr-2" />
              Enviar
            </label>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logos e Ícones - Tema Claro</CardTitle>
          <CardDescription>
            Logos e ícones exibidos quando o aplicativo está em modo claro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploadSection
            id="logo-icon-light"
            label="Ícone Menu"
            description="Essa imagem aparece no menu ao lado esquerdo do nome e email no tema claro"
            type="logo-icon-light"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logos e Ícones - Tema Escuro</CardTitle>
          <CardDescription>
            Logos e ícones exibidos quando o aplicativo está em modo escuro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploadSection
            id="logo-icon-dark"
            label="Ícone Menu"
            description="Essa imagem aparece no menu ao lado esquerdo do nome e email no tema escuro"
            type="logo-icon-dark"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            Ícone exibido na aba do navegador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadSection
            id="favicon"
            label="Favicon"
            description="Essa imagem aparece no navegador, como favicon"
            type="favicon"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo da Base de Conhecimento</CardTitle>
          <CardDescription>
            Logo exibido na página pública da base de conhecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadSection
            id="kb-logo-light"
            label="Logo Base de Conhecimento"
            description="Essa imagem aparece na página inicial da base de conhecimento, em cima do título Base de Conhecimento"
            type="kb-logo-light"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo do Artigo</CardTitle>
          <CardDescription>
            Logo exibido na barra superior dos artigos da base de conhecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadSection
            id="kb-article-logo"
            label="Logo do Artigo"
            description="Essa imagem aparece nos detalhes do post, na barra superior, entre os itens 'voltar para artigos' e o botão 'compartilhar'"
            type="kb-article-logo"
          />
        </CardContent>
      </Card>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Dicas para melhores resultados:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use imagens PNG com fundo transparente</li>
              <li>Logo completo: largura recomendada de 150-200px</li>
              <li>Ícone: formato quadrado, 64x64px ou 128x128px</li>
              <li>Tamanho máximo: 5MB por imagem</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
