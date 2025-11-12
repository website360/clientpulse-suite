import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface ArticleCommentsProps {
  postId: string;
}

export function ArticleComments({ postId }: ArticleCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    comment: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_comments')
        .select('id, user_name, comment, created_at')
        .eq('post_id', postId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('knowledge_base_comments')
        .insert({
          post_id: postId,
          user_id: user?.id || null,
          user_name: formData.name,
          user_email: formData.email || null,
          comment: formData.comment,
        });

      if (error) throw error;

      toast({
        title: 'Comentário enviado!',
        description: 'Seu comentário está aguardando aprovação e será exibido em breve.',
      });

      setFormData({ name: '', email: '', comment: '' });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Erro ao enviar comentário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Lista de comentários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentários e Dúvidas ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="border-l-4 border-primary/20 pl-4 py-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{comment.user_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {comment.comment}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Formulário de novo comentário */}
      <Card>
        <CardHeader>
          <CardTitle>Deixe seu comentário ou dúvida</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comentário *</Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                required
                rows={4}
                placeholder="Escreva seu comentário ou dúvida..."
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar Comentário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}