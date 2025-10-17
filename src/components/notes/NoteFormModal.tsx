import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { TagSelector } from './TagSelector';

const NOTE_COLORS = [
  { value: '#fef08a', label: 'Amarelo' },
  { value: '#fecdd3', label: 'Rosa' },
  { value: '#bfdbfe', label: 'Azul' },
  { value: '#bbf7d0', label: 'Verde' },
  { value: '#fed7aa', label: 'Laranja' },
  { value: '#e9d5ff', label: 'Roxo' },
];

const formSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  link_url: z.string().optional(),
  color: z.string(),
});

interface NoteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: any;
  onSuccess: () => void;
}

export function NoteFormModal({ open, onOpenChange, note, onSuccess }: NoteFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      link_url: '',
      color: NOTE_COLORS[0].value,
    },
  });

  useEffect(() => {
    const loadNoteTags = async () => {
      if (note) {
        const { data } = await supabase
          .from('note_tag_relationships')
          .select('tag_id, note_tags(id, name, color)')
          .eq('note_id', note.id);
        
        if (data) {
          const tags = data
            .map(rel => rel.note_tags)
            .filter((tag): tag is { id: string; name: string; color: string } => tag !== null);
          setSelectedTags(tags);
        }

        form.reset({
          title: note.title || '',
          content: note.content,
          link_url: note.link_url || '',
          color: note.color,
        });
        if (note.image_url) {
          setImagePreview(note.image_url);
        }
      } else if (!open) {
        form.reset({
          title: '',
          content: '',
          link_url: '',
          color: NOTE_COLORS[0].value,
        });
        setImageFile(null);
        setImagePreview(null);
        setSelectedTags([]);
      }
    };

    if (open) {
      loadNoteTags();
    }
  }, [note, open, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O tamanho máximo é 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let imageUrl = note?.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const noteData = {
        user_id: user.id,
        title: values.title || null,
        content: values.content,
        link_url: values.link_url || null,
        image_url: imageUrl,
        color: values.color,
      };

      let noteId = note?.id;

      if (note) {
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', note.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert(noteData)
          .select()
          .single();

        if (error) throw error;
        noteId = data.id;
      }

      // Update tags
      if (noteId) {
        // Remove old relationships
        await supabase
          .from('note_tag_relationships')
          .delete()
          .eq('note_id', noteId);

        // Add new relationships
        if (selectedTags.length > 0) {
          const relationships = selectedTags.map(tag => ({
            note_id: noteId,
            tag_id: tag.id,
          }));

          await supabase
            .from('note_tag_relationships')
            .insert(relationships);
        }
      }

      toast({
        title: note ? 'Anotação atualizada!' : 'Anotação criada!',
        description: note ? 'Sua anotação foi atualizada com sucesso.' : 'Sua anotação foi criada com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? 'Editar Anotação' : 'Nova Anotação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="Digite um título..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              {...form.register('content')}
              placeholder="Digite sua anotação... Você pode incluir texto, links e adicionar imagens abaixo."
              rows={8}
            />
            {form.formState.errors.content && (
              <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_url">Link (opcional)</Label>
            <Input
              id="link_url"
              {...form.register('link_url')}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagem (opcional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-auto rounded-md border"
                />
              </div>
            )}
          </div>

          <TagSelector
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />

          <div className="space-y-2">
            <Label>Cor do Post-it</Label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    form.watch('color') === color.value ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => form.setValue('color', color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {note ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
