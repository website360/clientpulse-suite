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
import { Loader2, X, Download, Upload } from 'lucide-react';
import { TagSelector } from './TagSelector';
import { Card } from '@/components/ui/card';

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [recentTags, setRecentTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
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
    const loadNoteData = async () => {
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
        
        // Load existing images
        if (note.image_urls) {
          setImageUrls(Array.isArray(note.image_urls) ? note.image_urls : []);
        }
      } else if (!open) {
        form.reset({
          title: '',
          content: '',
          link_url: '',
          color: NOTE_COLORS[0].value,
        });
        setImageUrls([]);
        setSelectedTags([]);
      }
    };

    const loadRecentTags = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recently used tags from user's notes
      const { data } = await supabase
        .from('note_tag_relationships')
        .select(`
          note_tags(id, name, color),
          notes!inner(created_at, user_id)
        `)
        .eq('notes.user_id', user.id)
        .order('notes.created_at', { ascending: false })
        .limit(20);

      if (data) {
        const uniqueTags = new Map();
        data.forEach((rel: any) => {
          const tag = rel.note_tags;
          if (tag && !uniqueTags.has(tag.id)) {
            uniqueTags.set(tag.id, tag);
          }
        });
        setRecentTags(Array.from(uniqueTags.values()).slice(0, 5));
      }
    };

    if (open) {
      loadNoteData();
      loadRecentTags();
    }
  }, [note, open, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Arquivo ${file.name} muito grande (máximo 5MB)`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('note-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('note-images')
          .getPublicUrl(fileName);

        return publicUrl;
      });

      const newUrls = await Promise.all(uploadPromises);
      setImageUrls([...imageUrls, ...newUrls]);

      toast({
        title: 'Imagens enviadas!',
        description: `${newUrls.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageUrls(imageUrls.filter(u => u !== url));
  };

  const handleDownloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `imagem-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast({
        title: 'Erro ao baixar imagem',
        description: 'Não foi possível baixar a imagem',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const noteData = {
        user_id: user.id,
        title: values.title || null,
        content: values.content,
        link_url: values.link_url || null,
        image_urls: imageUrls,
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
        await supabase
          .from('note_tag_relationships')
          .delete()
          .eq('note_id', noteId);

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
              placeholder="Digite sua anotação..."
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
            <Label>Imagens (opcional)</Label>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Enviando...' : 'Clique para adicionar imagens'}
                  </p>
                  <p className="text-xs text-muted-foreground">Máximo 5MB por arquivo</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>

              {imageUrls.length > 0 && (
                <div className="space-y-2">
                  {imageUrls.map((url, index) => (
                    <Card key={url} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          Imagem {index + 1}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadImage(url)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(url)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <TagSelector
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            recentTags={recentTags}
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
