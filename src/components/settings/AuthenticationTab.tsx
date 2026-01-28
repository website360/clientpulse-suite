import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { uploadBrandingFile, loadBrandingUrl } from '@/lib/branding';

export function AuthenticationTab() {
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  const [logoDarkImage, setLogoDarkImage] = useState<string>('');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const logoDarkUrl = await loadBrandingUrl('auth-logo-dark', '');
      
      setLogoDarkImage(logoDarkUrl);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleLogoDarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingLogoDark(true);

    try {
      const { url, error } = await uploadBrandingFile('auth-logo-dark', file);
      
      if (error) throw new Error(error);

      setLogoDarkImage(url);
      
      window.dispatchEvent(new CustomEvent('logoUpdated', { 
        detail: { type: 'auth-logo-dark' } 
      }));

      toast.success('Logo escura atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setUploadingLogoDark(false);
    }
  };

  const handleRemoveLogoDark = async () => {
    try {
      const { data: existingFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-logo-dark'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('branding')
          .remove(existingFiles.map(f => f.name));
        
        setLogoDarkImage('');
        
        window.dispatchEvent(new CustomEvent('logoUpdated', { 
          detail: { type: 'auth-logo-dark' } 
        }));
        
        toast.success('Logo escura removida com sucesso!');
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erro ao remover logo');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personalização da Tela de Login</CardTitle>
          <CardDescription>
            Personalize a aparência da tela de autenticação com suas próprias imagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Dark Image */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Logo do Formulário - Versão Escura</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Logo exibida no tema escuro (recomendado: 200x60px, fundo transparente)
              </p>
            </div>
            
            {logoDarkImage && (
              <div className="relative w-48 h-24 rounded-lg overflow-hidden border border-border bg-slate-900 flex items-center justify-center">
                <img 
                  src={logoDarkImage} 
                  alt="Logo escura preview" 
                  className="max-w-full max-h-full object-contain p-2"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveLogoDark}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                id="logo-dark-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoDarkUpload}
                disabled={uploadingLogoDark}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('logo-dark-upload')?.click()}
                disabled={uploadingLogoDark}
              >
                {uploadingLogoDark ? (
                  <>Fazendo upload...</>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {logoDarkImage ? 'Alterar Logo Escura' : 'Fazer Upload'}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Use imagens de alta qualidade para garantir uma boa aparência em diferentes tamanhos de tela. 
              Formatos recomendados: PNG (com transparência) ou JPG.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
