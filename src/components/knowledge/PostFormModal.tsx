import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Upload } from 'lucide-react';
import { EmojiPicker } from '@/components/shared/EmojiPicker';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category_id: string | null;
  is_published: boolean;
}

interface PostFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  onSuccess: () => void;
}

export function PostFormModal({ open, onOpenChange, post, onSuccess }: PostFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category_id: '',
    featured_image_url: '',
    is_published: false,
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (post) {
        setFormData({
          title: post.title,
          excerpt: post.excerpt || '',
          content: post.content,
          category_id: post.category_id || '',
          featured_image_url: post.featured_image_url || '',
          is_published: post.is_published,
        });
      } else {
        resetForm();
      }
    }
  }, [open, post]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `knowledge-base/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image_url: publicUrl });
      toast({ title: 'Imagem enviada com sucesso!' });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const slug = generateSlug(formData.title);
      const postData = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt || null,
        content: formData.content,
        category_id: formData.category_id || null,
        featured_image_url: formData.featured_image_url || null,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (post) {
        const { error } = await supabase
          .from('knowledge_base_posts')
          .update(postData)
          .eq('id', post.id);

        if (error) throw error;
        toast({ title: 'Post atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('knowledge_base_posts')
          .insert({
            ...postData,
            created_by: user.id,
          });

        if (error) throw error;
        toast({ title: 'Post criado com sucesso!' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Erro ao salvar post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category_id: '',
      featured_image_url: '',
      is_published: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Resumo</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows={2}
              placeholder="Breve descrição do artigo..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Imagem de Destaque</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
            </div>
            {formData.featured_image_url && (
              <img
                src={formData.featured_image_url}
                alt="Preview"
                className="mt-2 h-32 w-auto rounded border object-cover"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Conteúdo *</Label>
              <EmojiPicker 
                onEmojiSelect={(emoji) => setFormData({ ...formData, content: formData.content + emoji })}
              />
            </div>
            <div className="min-h-[500px]">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                style={{ height: '450px' }}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'image', 'video'],
                    ['clean'],
                  ],
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label htmlFor="is_published">Publicado</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
