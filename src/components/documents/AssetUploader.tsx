import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AssetUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  description?: string;
  folder: 'headers' | 'footers' | 'backgrounds' | 'watermarks';
  accept?: string;
  maxSizeMB?: number;
}

export function AssetUploader({
  value,
  onChange,
  label,
  description,
  folder,
  accept = 'image/*',
  maxSizeMB = 5,
}: AssetUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Por favor, selecione apenas arquivos de imagem';
    }

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `A imagem deve ter no máximo ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Erro',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('document-templates-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('document-templates-assets')
        .getPublicUrl(fileName);

      onChange(data.publicUrl);

      toast({
        title: 'Upload concluído',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível enviar a imagem',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extrair o path do arquivo da URL
      const urlParts = value.split('/document-templates-assets/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage
          .from('document-templates-assets')
          .remove([filePath]);
      }
      
      onChange('');
      
      toast({
        title: 'Imagem removida',
        description: 'A imagem foi removida com sucesso',
      });
    } catch (error) {
      console.error('Error removing file:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a imagem',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {value ? (
        <Card className="relative overflow-hidden">
          <img
            src={value}
            alt={label}
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <Card
          className={cn(
            'border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            dragActive && 'border-primary bg-primary/5',
            'hover:border-primary/50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Upload className="h-10 w-10 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Clique ou arraste uma imagem aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos: PNG, JPG, WEBP (máx. {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </Card>
      )}
    </div>
  );
}
