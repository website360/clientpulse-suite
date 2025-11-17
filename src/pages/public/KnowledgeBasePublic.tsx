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
import logoIconLight from '@/assets/logo-icon-light.png';
import { ArticleRating } from '@/components/knowledge/ArticleRating';
import { ArticleComments } from '@/components/knowledge/ArticleComments';
import { RelatedArticles } from '@/components/knowledge/RelatedArticles';
import { ArticleSEO } from '@/components/knowledge/ArticleSEO';
import { PDFExport } from '@/components/knowledge/PDFExport';

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
  const [kbLogo, setKbLogo] = useState<string>(logoIconLight);
  const [articleLogo, setArticleLogo] = useState<string>('');

  useEffect(() => {
    // Carregar logos do Storage (fonte principal) com fallback
    const loadLogos = async () => {
      const { loadBrandingUrl } = await import('@/lib/branding');
      
      const kbUrl = await loadBrandingUrl('kb-logo-light', logoIconLight);
      const articleUrl = await loadBrandingUrl('kb-article-logo', '');
      
      setKbLogo(kbUrl);
      if (articleUrl) setArticleLogo(articleUrl);
    };
    
    loadLogos();

    // Listener para atualizações de logo
    const handleLogoUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.type === 'kb-logo-light' || customEvent.detail.type === 'kb-article-logo') {
        loadLogos();
      }
    };

    window.addEventListener('logoUpdated', handleLogoUpdate);

    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

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
    const stripHtml = (html: string) => {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    return (
      <>
        {/* SEO Meta Tags */}
        <ArticleSEO
          title={selectedPost.title}
          description={selectedPost.excerpt || stripHtml(selectedPost.content).substring(0, 160)}
          slug={selectedPost.slug}
          imageUrl={selectedPost.featured_image_url || undefined}
          publishedAt={selectedPost.published_at || selectedPost.created_at}
          modifiedAt={selectedPost.created_at}
          category={selectedPost.knowledge_base_categories?.name}
        />

        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10" role="banner">
            <div className="container py-4">
              <nav className="flex items-center justify-between gap-4" aria-label="Navegação do artigo">
                <Button 
                  variant="ghost" 
                  onClick={handleBackToList} 
                  size="lg" 
                  className="flex-shrink-0"
                  aria-label="Voltar para lista de artigos"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" aria-hidden="true" />
                  Voltar para artigos
                </Button>
                
                {/* Logo centralizado */}
                <div className="flex-1 flex justify-center">
                  {articleLogo && (
                    <img 
                      src={articleLogo} 
                      alt="Logo da empresa" 
                      className="h-10 w-auto object-contain"
                    />
                  )}
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <PDFExport 
                    title={selectedPost.title}
                    content={selectedPost.content}
                    excerpt={selectedPost.excerpt || undefined}
                  />
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handleCopyPostLink}
                    aria-label="Compartilhar artigo"
                  >
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                    Compartilhar
                  </Button>
                </div>
              </nav>
            </div>
          </header>

          {/* Article Content */}
          <div className="container max-w-7xl py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Content */}
              <main className="lg:col-span-8 space-y-12" role="main">
                <article className="space-y-8">
                  {/* Article Header */}
                  <header className="space-y-6">
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
                        <time 
                          className="flex items-center gap-2"
                          dateTime={selectedPost.created_at}
                        >
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {formatDistanceToNow(new Date(selectedPost.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </time>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span className="font-medium">
                            {selectedPost.view_count} visualizações
                          </span>
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
                  </header>

                  {/* Divider */}
                  <hr className="border-t" aria-hidden="true" />

                  {/* Article Content */}
                  <div
                    className="prose prose-lg md:prose-xl max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-muted prose-pre:border"
                    dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                  />
                </article>

                {/* Article Rating */}
                <section aria-labelledby="article-rating-title">
                  <h2 id="article-rating-title" className="sr-only">Avalie este artigo</h2>
                  <ArticleRating postId={selectedPost.id} />
                </section>

                {/* Comments Section */}
                <section aria-labelledby="comments-title">
                  <h2 id="comments-title" className="sr-only">Comentários</h2>
                  <ArticleComments postId={selectedPost.id} />
                </section>
              </main>

              {/* Sidebar */}
              <aside className="lg:col-span-4" role="complementary" aria-label="Artigos relacionados">
                <div className="lg:sticky lg:top-24">
                  <RelatedArticles 
                    currentPostId={selectedPost.id}
                    categoryId={selectedPost.category_id}
                  />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* SEO para página de listagem */}
      <ArticleSEO
        title="Base de Conhecimento"
        description="Tutoriais, guias e documentação para ajudar você. Encontre respostas para suas dúvidas e aprenda a usar nossos produtos e serviços."
        slug=""
        imageUrl={`${window.location.origin}/og-image.png`}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <header 
          className="relative text-primary-foreground overflow-hidden border-b-4 border-accent" 
          style={{ backgroundColor: '#193366' }}
          role="banner"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDMwaDJ2MmgtMnYtMnptMC0xMGgtMnYyaDJ2LTJ6bTAgMTBoMnYyaC0ydi0yem0wLTEwaDJ2MmgtMnYtMnptMCAxMGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-100" aria-hidden="true"></div>

          <div className="container relative py-10 md:py-13">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="flex justify-center mb-8 mt-4">
                <img 
                  src={kbLogo}
                  alt="Logo da empresa" 
                  className="h-14 w-auto object-contain"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Base de Conhecimento
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90">
                Tutoriais, guias e documentação para ajudar você
              </p>
              
              {/* Search */}
              <div className="max-w-2xl mx-auto pt-2">
                <form role="search" aria-label="Pesquisar artigos">
                  <div className="relative">
                    <label htmlFor="search-input" className="sr-only">
                      Pesquisar artigos
                    </label>
                    <Search 
                      className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" 
                      aria-hidden="true"
                    />
                    <Input
                      id="search-input"
                      placeholder="Pesquisar artigos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-14 pl-12 pr-4 text-lg bg-background/95 backdrop-blur border-0 shadow-xl"
                      aria-label="Campo de busca"
                    />
                  </div>
                </form>
              </div>

              {/* Categories */}
              <nav aria-label="Filtrar por categoria">
                <div className="flex flex-wrap gap-2 justify-center pt-4">
                  <Button
                    variant={selectedCategory === '' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                    className={`rounded-full px-4 h-9 text-sm font-medium transition-all ${
                      selectedCategory === '' 
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                        : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
                    }`}
                    aria-pressed={selectedCategory === ''}
                  >
                    Todas
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`rounded-full px-4 h-9 text-sm font-medium transition-all ${
                        selectedCategory === category.id
                          ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                          : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
                      }`}
                      aria-pressed={selectedCategory === category.id}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </header>

        <main className="container py-12" role="main">
          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <p className="text-xl text-muted-foreground">Nenhum artigo encontrado</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article
                  key={post.id}
                  aria-labelledby={`article-title-${post.id}`}
                >
                  <Card
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/20 h-full flex flex-col"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.featured_image_url ? (
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={`Imagem de ${post.title}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="h-56 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/20" aria-hidden="true" />
                      </div>
                    )}
                    
                    <CardHeader className="space-y-4 flex-1">
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
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span className="font-medium">{post.view_count}</span>
                          <span className="sr-only">visualizações</span>
                        </div>
                      </div>
                      
                      <CardTitle 
                        id={`article-title-${post.id}`}
                        className="text-2xl line-clamp-2 group-hover:text-primary transition-colors"
                      >
                        {post.title}
                      </CardTitle>
                      
                      <CardDescription className="text-base line-clamp-3">
                        {post.excerpt || 'Clique para ler mais...'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <time 
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        dateTime={post.created_at}
                      >
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </time>
                    </CardContent>
                  </Card>
                </article>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}
