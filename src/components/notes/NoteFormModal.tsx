import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

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
  content: z.string().min(1, 'Conteúdo obrigatório'),
  note_type: z.enum(['text', 'link', 'image']),
  link_url: z.string().url('URL inválida').optional().or(z.literal('')),
  color: z.string().default('#fef08a'),
});

interface NoteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: any;
  onSuccess: () => void;
}

export function NoteFormModal({ open, onOpenChange, note, onSuccess }: NoteFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      note_type: 'text',
      link_url: '',
      color: '#fef08a',
    },
  });

  const noteType = form.watch('note_type');

  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title || '',
        content: note.content || '',
        note_type: note.note_type,
        link_url: note.link_url || '',
        color: note.color || '#fef08a',
      });
      if (note.image_url) {
        setImagePreview(note.image_url);
      }
    } else {
      form.reset({
        title: '',
        content: '',
        note_type: 'text',
        link_url: '',
        color: '#fef08a',
      });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [note, open]);

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

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('note-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível fazer upload da imagem',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setLoading(true);
    try {
      let imageUrl = note?.image_url || null;

      if (values.note_type === 'image' && imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setLoading(false);
          return;
        }
      }

      const noteData = {
        user_id: user.id,
        title: values.title || null,
        content: values.content,
        note_type: values.note_type,
        link_url: values.note_type === 'link' ? values.link_url : null,
        image_url: imageUrl,
        color: values.color,
      };

      if (note) {
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', note.id);

        if (error) throw error;

        toast({
          title: 'Anotação atualizada',
          description: 'Sua anotação foi atualizada com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('notes')
          .insert(noteData);

        if (error) throw error;

        toast({
          title: 'Anotação criada',
          description: 'Sua anotação foi criada com sucesso',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a anotação',
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={noteType} onValueChange={(value) => form.setValue('note_type', value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">Texto</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
                <TabsTrigger value="image">Imagem</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite um título..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite sua anotação..." 
                          className="min-h-[200px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="link" className="space-y-4">
                <FormField
                  control={form.control}
                  name="link_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite um título..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Adicione notas sobre este link..." 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="image" className="space-y-4">
                <FormItem>
                  <FormLabel>Imagem</FormLabel>
                  <div className="space-y-4">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                        <p className="text-xs text-muted-foreground">Máximo 5MB</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>

                    {imagePreview && (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legenda (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Adicione uma legenda..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex gap-2">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`h-10 w-10 rounded-full border-2 transition-all ${
                          field.value === color.value ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.onChange(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
