import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function AppearanceTab() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'favicon' | 'logo-light' | 'logo-dark' | 'logo-icon-light' | 'logo-icon-dark' | 'auth-logo-light' | 'auth-logo-dark'
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

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Salvar configuração no localStorage para uso imediato
      const { data } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

      localStorage.setItem(`app-${type}`, data.publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Imagem atualizada com sucesso. Recarregue a página para ver as alterações.',
      });

      // Recarregar após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível fazer upload da imagem.',
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
    type: 'favicon' | 'logo-light' | 'logo-dark' | 'logo-icon-light' | 'logo-icon-dark' | 'auth-logo-light' | 'auth-logo-dark';
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(id)?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Enviando...' : 'Fazer Upload'}
        </Button>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, type)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logos e Ícones - Tema Claro</CardTitle>
          <CardDescription>
            Personalize os logos e ícones para o tema claro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploadSection
            id="logo-light"
            label="Logo Completo (Menu Aberto)"
            description="Logo exibido quando o menu lateral está expandido"
            type="logo-light"
          />
          <LogoUploadSection
            id="logo-icon-light"
            label="Ícone (Menu Fechado)"
            description="Ícone exibido quando o menu lateral está recolhido"
            type="logo-icon-light"
          />
          <LogoUploadSection
            id="auth-logo-light"
            label="Logo da Tela de Login"
            description="Logo exibido na tela de autenticação"
            type="auth-logo-light"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logos e Ícones - Tema Escuro</CardTitle>
          <CardDescription>
            Personalize os logos e ícones para o tema escuro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploadSection
            id="logo-dark"
            label="Logo Completo (Menu Aberto)"
            description="Logo exibido quando o menu lateral está expandido no tema escuro"
            type="logo-dark"
          />
          <LogoUploadSection
            id="logo-icon-dark"
            label="Ícone (Menu Fechado)"
            description="Ícone exibido quando o menu lateral está recolhido no tema escuro"
            type="logo-icon-dark"
          />
          <LogoUploadSection
            id="auth-logo-dark"
            label="Logo da Tela de Login"
            description="Logo exibido na tela de autenticação no tema escuro"
            type="auth-logo-dark"
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
            description="Recomendado: 32x32px ou 64x64px, formato PNG ou ICO"
            type="favicon"
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
              <li>Tamanho máximo: 2MB por imagem</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
