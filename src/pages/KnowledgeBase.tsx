import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast, toastSuccess } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Filter, Copy, MoreVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostFormModal } from '@/components/knowledge/PostFormModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category_id: string | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
  published_at: string | null;
  knowledge_base_categories: {
    name: string;
    color: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function KnowledgeBase() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

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

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('knowledge_base_posts')
        .select(`
          *,
          knowledge_base_categories (
            name,
            color
          )
        `)
        .order('title', { ascending: true });

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Erro ao carregar posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from('knowledge_base_posts')
        .delete()
        .eq('id', postToDelete);

      if (error) throw error;
      toastSuccess('Post excluído', 'Post excluído com sucesso!');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Erro ao excluir post',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleCopyLink = (slug: string) => {
    const link = `${window.location.origin}/base-conhecimento/${slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link do artigo foi copiado para a área de transferência.',
    });
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout breadcrumbLabel="Base de Conhecimento">
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">Base de Conhecimento</h1>
              <p className="text-[15px] text-muted-foreground">
                Gerencie artigos e tutoriais para seus clientes
              </p>
            </div>
            <Button onClick={() => {
              setEditingPost(null);
              setIsModalOpen(true);
            }} size="lg" className="h-11 shadow-md hover:shadow-lg bg-[#141924] hover:bg-[#1a2030] text-white">
              Novo Post
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={{ height: '40px' }}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[250px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
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
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum post encontrado
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
                <div className="col-span-5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categoria</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
                </div>
              </div>

              {/* Post Rows as Cards */}
              {filteredPosts.map((post, index) => (
                <Card 
                  key={post.id}
                  className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                    {/* Título */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-3">
                        {post.featured_image_url && (
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-foreground line-clamp-1">{post.title}</p>
                          {post.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{post.excerpt}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Categoria */}
                    <div className="col-span-2">
                      {post.knowledge_base_categories ? (
                        <Badge
                          className="text-[12px]"
                          style={{
                            backgroundColor: `${post.knowledge_base_categories.color}20`,
                            color: post.knowledge_base_categories.color,
                          }}
                        >
                          {post.knowledge_base_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-[14px] text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge variant={post.is_published ? 'default' : 'secondary'}>
                        {post.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </div>

                    {/* Data */}
                    <div className="col-span-2">
                      <p className="text-[14px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                          <DropdownMenuItem onClick={() => handleCopyLink(post.slug)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(post)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(post.id)}
                            className="text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>

      <PostFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        post={editingPost}
        onSuccess={fetchPosts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
