import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Eye, Calendar, Copy, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category_id: string | null;
  view_count: number;
  created_at: string;
  published_at: string | null;
  knowledge_base_categories: {
    name: string;
    color: string;
  } | null;
}

export default function KnowledgeBasePublic() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchCategories();
    if (slug) {
      fetchPostBySlug(slug);
    } else {
      fetchPosts();
    }
  }, [slug]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('*')
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
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostBySlug = async (postSlug: string) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_posts')
        .select(`
          *,
          knowledge_base_categories (
            name,
            color
          )
        `)
        .eq('slug', postSlug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      
      setSelectedPost(data);
      
      // Increment view count
      await supabase
        .from('knowledge_base_posts')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);
    } catch (error) {
      console.error('Error fetching post:', error);
      navigate('/base-conhecimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) {
      fetchPosts();
    }
  }, [selectedCategory]);

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePostClick = (post: Post) => {
    navigate(`/base-conhecimento/${post.slug}`);
  };

  const handleBackToList = () => {
    navigate('/base-conhecimento');
    setSelectedPost(null);
  };

  const handleCopyPostLink = () => {
    const link = `${window.location.origin}/base-conhecimento/${selectedPost?.slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link do artigo foi copiado para a área de transferência.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleBackToList} size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar para artigos
              </Button>
              <Button variant="outline" size="lg" onClick={handleCopyPostLink}>
                <Copy className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="container max-w-4xl py-12">
          <article className="space-y-8">
            {/* Featured Image */}
            {selectedPost.featured_image_url && (
              <div className="relative h-96 rounded-2xl overflow-hidden">
                <img
                  src={selectedPost.featured_image_url}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            )}

            {/* Article Header */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                {selectedPost.knowledge_base_categories && (
                  <Badge
                    className="text-base px-4 py-1.5 rounded-full"
                    style={{
                      backgroundColor: `${selectedPost.knowledge_base_categories.color}20`,
                      color: selectedPost.knowledge_base_categories.color,
                      border: `1px solid ${selectedPost.knowledge_base_categories.color}40`,
                    }}
                  >
                    {selectedPost.knowledge_base_categories.name}
                  </Badge>
                )}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(selectedPost.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">{selectedPost.view_count} visualizações</span>
                  </div>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                {selectedPost.title}
              </h1>
              
              {selectedPost.excerpt && (
                <p className="text-2xl text-muted-foreground leading-relaxed">
                  {selectedPost.excerpt}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Article Content */}
            <div
              className="prose prose-lg md:prose-xl max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-muted prose-pre:border"
              dangerouslySetInnerHTML={{ __html: selectedPost.content }}
            />
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoMnYyaC0ydi0yem0wLTEwaC0ydjJoMnYtMnptMCAxMGgydjJoLTJ2LTJ6bTAtMTBoMnYyaC0ydi0yem0wIDEwaDJ2MmgtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        <div className="container relative py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Base de Conhecimento
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              Tutoriais, guias e documentação para ajudar você
            </p>
            
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar artigos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 pl-12 pr-4 text-lg bg-background/95 backdrop-blur border-0 shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Categories */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              size="lg"
              onClick={() => setSelectedCategory('')}
              className="rounded-full"
            >
              Todas as Categorias
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSelectedCategory(category.id)}
                className="rounded-full"
                style={
                  selectedCategory === category.id
                    ? {
                        backgroundColor: category.color,
                        borderColor: category.color,
                      }
                    : {}
                }
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <p className="text-xl text-muted-foreground">Nenhum artigo encontrado</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/20"
                onClick={() => handlePostClick(post)}
              >
                {post.featured_image_url ? (
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                ) : (
                  <div className="h-56 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-primary/20" />
                  </div>
                )}
                
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    {post.knowledge_base_categories && (
                      <Badge
                        className="rounded-full px-3 py-1"
                        style={{
                          backgroundColor: `${post.knowledge_base_categories.color}20`,
                          color: post.knowledge_base_categories.color,
                          border: `1px solid ${post.knowledge_base_categories.color}40`,
                        }}
                      >
                        {post.knowledge_base_categories.name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">{post.view_count}</span>
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  
                  <CardDescription className="text-base line-clamp-3">
                    {post.excerpt || 'Clique para ler mais...'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
