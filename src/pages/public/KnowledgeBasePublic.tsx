import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Eye, Calendar } from 'lucide-react';
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
        <div className="container max-w-4xl py-8">
          <Button variant="ghost" onClick={handleBackToList} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <article className="space-y-6">
            {selectedPost.featured_image_url && (
              <img
                src={selectedPost.featured_image_url}
                alt={selectedPost.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedPost.knowledge_base_categories && (
                  <Badge
                    style={{
                      backgroundColor: `${selectedPost.knowledge_base_categories.color}20`,
                      color: selectedPost.knowledge_base_categories.color,
                    }}
                  >
                    {selectedPost.knowledge_base_categories.name}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(selectedPost.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedPost.view_count} visualizações
                </div>
              </div>

              <h1 className="text-4xl font-bold">{selectedPost.title}</h1>
              
              {selectedPost.excerpt && (
                <p className="text-xl text-muted-foreground">{selectedPost.excerpt}</p>
              )}

              <div
                className="prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Base de Conhecimento</h1>
            <p className="text-xl text-muted-foreground">
              Tutoriais e artigos para ajudar você
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar artigos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === '' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('')}
                  >
                    Todas
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category.id)}
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
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum artigo encontrado</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handlePostClick(post)}
                >
                  {post.featured_image_url && (
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      {post.knowledge_base_categories && (
                        <Badge
                          style={{
                            backgroundColor: `${post.knowledge_base_categories.color}20`,
                            color: post.knowledge_base_categories.color,
                          }}
                        >
                          {post.knowledge_base_categories.name}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {post.view_count}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.excerpt || 'Clique para ler mais...'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
