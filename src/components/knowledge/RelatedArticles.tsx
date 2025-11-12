import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  view_count: number;
  knowledge_base_categories: {
    name: string;
    color: string;
  } | null;
}

interface RelatedArticlesProps {
  currentPostId: string;
  categoryId: string | null;
}

export function RelatedArticles({ currentPostId, categoryId }: RelatedArticlesProps) {
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRelatedPosts();
  }, [currentPostId, categoryId]);

  const fetchRelatedPosts = async () => {
    try {
      let query = supabase
        .from('knowledge_base_posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          view_count,
          knowledge_base_categories (
            name,
            color
          )
        `)
        .eq('is_published', true)
        .neq('id', currentPostId)
        .order('view_count', { ascending: false })
        .limit(3);

      // Prioriza artigos da mesma categoria
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRelatedPosts(data || []);
    } catch (error) {
      console.error('Error fetching related posts:', error);
    }
  };

  if (relatedPosts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Artigos Relacionados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {relatedPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/base-conhecimento/${post.slug}`)}
            className="group cursor-pointer border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex gap-4">
              {post.featured_image_url ? (
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-20 h-20 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-1">
                  {post.title}
                </h4>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {post.knowledge_base_categories && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: post.knowledge_base_categories.color,
                        color: post.knowledge_base_categories.color,
                      }}
                    >
                      {post.knowledge_base_categories.name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {post.view_count}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}