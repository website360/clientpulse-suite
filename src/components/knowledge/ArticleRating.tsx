import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ArticleRatingProps {
  postId: string;
}

export function ArticleRating({ postId }: ArticleRatingProps) {
  const [hasRated, setHasRated] = useState(false);
  const [ratings, setRatings] = useState({ helpful: 0, notHelpful: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchRatings();
    checkIfRated();
  }, [postId]);

  const getUserIP = () => {
    // Use uma combinação de fatores do navegador como identificador único
    return `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
  };

  const checkIfRated = () => {
    const ratedPosts = JSON.parse(localStorage.getItem('ratedPosts') || '{}');
    setHasRated(!!ratedPosts[postId]);
  };

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_ratings')
        .select('is_helpful')
        .eq('post_id', postId);

      if (error) throw error;

      const helpful = data?.filter(r => r.is_helpful).length || 0;
      const notHelpful = data?.filter(r => !r.is_helpful).length || 0;
      setRatings({ helpful, notHelpful });
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const handleRating = async (isHelpful: boolean) => {
    if (hasRated) {
      toast({
        title: 'Você já avaliou este artigo',
        description: 'Cada artigo pode ser avaliado apenas uma vez.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const userIP = getUserIP();
      const { error } = await supabase
        .from('knowledge_base_ratings')
        .insert({
          post_id: postId,
          user_ip: userIP,
          is_helpful: isHelpful,
        });

      if (error) throw error;

      // Marcar como avaliado no localStorage
      const ratedPosts = JSON.parse(localStorage.getItem('ratedPosts') || '{}');
      ratedPosts[postId] = true;
      localStorage.setItem('ratedPosts', JSON.stringify(ratedPosts));

      setHasRated(true);
      fetchRatings();

      toast({
        title: 'Obrigado pela sua avaliação!',
        description: 'Seu feedback nos ajuda a melhorar o conteúdo.',
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: 'Erro ao salvar avaliação',
        variant: 'destructive',
      });
    }
  };

  const totalRatings = ratings.helpful + ratings.notHelpful;
  const helpfulPercentage = totalRatings > 0 
    ? Math.round((ratings.helpful / totalRatings) * 100)
    : 0;

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">
            Este artigo foi útil?
          </h3>
          
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant={hasRated ? "secondary" : "default"}
              onClick={() => handleRating(true)}
              disabled={hasRated}
              className="flex items-center gap-2"
            >
              <ThumbsUp className="h-5 w-5" />
              Sim ({ratings.helpful})
            </Button>
            <Button
              size="lg"
              variant={hasRated ? "secondary" : "outline"}
              onClick={() => handleRating(false)}
              disabled={hasRated}
              className="flex items-center gap-2"
            >
              <ThumbsDown className="h-5 w-5" />
              Não ({ratings.notHelpful})
            </Button>
          </div>

          {totalRatings > 0 && (
            <p className="text-sm text-center text-muted-foreground">
              {helpfulPercentage}% das pessoas acharam este artigo útil ({totalRatings} avaliações)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}