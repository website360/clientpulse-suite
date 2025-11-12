import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User, AtSign, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface StageCommentsProps {
  stageId: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  is_internal: boolean;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function StageComments({ stageId }: StageCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['stage-comments', stageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stage_comments')
        .select('*')
        .eq('project_stage_id', stageId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Combinar dados
      return data.map(comment => ({
        ...comment,
        profiles: profiles?.find(p => p.id === comment.user_id) || {
          full_name: 'Usuário',
          avatar_url: null,
        },
      })) as Comment[];
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ text, internal }: { text: string; internal: boolean }) => {
      const { data: commentData, error } = await supabase
        .from('project_stage_comments')
        .insert({
          project_stage_id: stageId,
          user_id: user?.id,
          comment: text,
          is_internal: internal,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Detectar menções (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = text.match(mentionRegex);
      
      if (mentions && teamMembers) {
        for (const mention of mentions) {
          const username = mention.slice(1);
          const mentionedUser = teamMembers.find(
            m => m.full_name.toLowerCase().includes(username.toLowerCase())
          );
          
          if (mentionedUser) {
            await supabase
              .from('project_comment_mentions')
              .insert({
                comment_id: commentData.id,
                mentioned_user_id: mentionedUser.id,
              });
          }
        }
      }

      return commentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-comments', stageId] });
      setComment('');
      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro ao adicionar comentário',
        description: 'Não foi possível publicar o comentário.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate({ text: comment, internal: isInternal });
  };

  const insertMention = (name: string) => {
    const cursorPosition = comment.length;
    const mention = `@${name.split(' ')[0]} `;
    setComment(comment + mention);
    setShowMentions(false);
  };

  if (isLoading) return <div>Carregando comentários...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentário... Use @nome para mencionar alguém"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                  />
                  <Label htmlFor="internal" className="flex items-center gap-1 text-sm cursor-pointer">
                    <Lock className="h-3 w-3" />
                    Comentário Interno
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMentions(!showMentions)}
                >
                  <AtSign className="h-4 w-4 mr-1" />
                  Mencionar
                </Button>
              </div>
              <Button type="submit" disabled={!comment.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>

          {showMentions && teamMembers && (
            <div className="border rounded-lg p-2 space-y-1">
              <p className="text-sm font-medium mb-2">Mencionar:</p>
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member.full_name)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-accent text-sm"
                >
                  @{member.full_name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="space-y-3">
          {comments && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </p>
          )}
          
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 border rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={c.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {c.profiles?.full_name || 'Usuário'}
                  </span>
                  {c.is_internal && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Interno
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}