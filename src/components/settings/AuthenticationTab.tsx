import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

export function AuthenticationTab() {
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [logoImage, setLogoImage] = useState<string>('');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      // Carregar imagem de fundo
      const { data: bgFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-background'
        });

      if (bgFiles && bgFiles.length > 0) {
        const { data: bgData } = supabase.storage
          .from('branding')
          .getPublicUrl(bgFiles[0].name);
        setBackgroundImage(bgData.publicUrl);
      }

      // Carregar logo do formulário
      const { data: logoFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-logo-light'
        });

      if (logoFiles && logoFiles.length > 0) {
        const { data: logoData } = supabase.storage
          .from('branding')
          .getPublicUrl(logoFiles[0].name);
        setLogoImage(logoData.publicUrl);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingBg(true);

    try {
      // Remover imagem antiga se existir
      const { data: existingFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-background'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('branding')
          .remove(existingFiles.map(f => f.name));
      }

      // Upload nova imagem
      const fileName = `auth-background-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Buscar URL pública
      const { data } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setBackgroundImage(data.publicUrl);
      
      // Disparar evento para atualizar o preview
      window.dispatchEvent(new CustomEvent('logoUpdated', { 
        detail: { type: 'auth-background' } 
      }));

      toast.success('Imagem de fundo atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Remover logo antiga se existir
      const { data: existingFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-logo-light'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('branding')
          .remove(existingFiles.map(f => f.name));
      }

      // Upload nova logo
      const fileName = `auth-logo-light-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Buscar URL pública
      const { data } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setLogoImage(data.publicUrl);
      
      // Disparar evento para atualizar o preview
      window.dispatchEvent(new CustomEvent('logoUpdated', { 
        detail: { type: 'auth-logo-light' } 
      }));

      toast.success('Logo atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveBackground = async () => {
    try {
      const { data: existingFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-background'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('branding')
          .remove(existingFiles.map(f => f.name));
        
        setBackgroundImage('');
        
        window.dispatchEvent(new CustomEvent('logoUpdated', { 
          detail: { type: 'auth-background' } 
        }));
        
        toast.success('Imagem de fundo removida com sucesso!');
      }
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: existingFiles } = await supabase.storage
        .from('branding')
        .list('', {
          search: 'auth-logo-light'
        });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('branding')
          .remove(existingFiles.map(f => f.name));
        
        setLogoImage('');
        
        window.dispatchEvent(new CustomEvent('logoUpdated', { 
          detail: { type: 'auth-logo-light' } 
        }));
        
        toast.success('Logo removida com sucesso!');
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
          {/* Background Image */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Imagem de Fundo</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Imagem exibida no lado esquerdo da tela de login (recomendado: 1920x1080px)
              </p>
            </div>
            
            {backgroundImage && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                <img 
                  src={backgroundImage} 
                  alt="Background preview" 
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveBackground}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                id="background-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                disabled={uploadingBg}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('background-upload')?.click()}
                disabled={uploadingBg}
              >
                {uploadingBg ? (
                  <>Fazendo upload...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {backgroundImage ? 'Alterar Imagem' : 'Fazer Upload'}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Logo Image */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Logo do Formulário</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Logo exibida na área de boas-vindas (recomendado: 200x60px, fundo transparente)
              </p>
            </div>
            
            {logoImage && (
              <div className="relative w-48 h-24 rounded-lg overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
                <img 
                  src={logoImage} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain p-2"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <>Fazendo upload...</>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {logoImage ? 'Alterar Logo' : 'Fazer Upload'}
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
