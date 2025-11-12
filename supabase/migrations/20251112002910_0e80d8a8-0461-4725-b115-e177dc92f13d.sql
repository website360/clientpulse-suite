-- Tabela de avaliações de utilidade dos artigos
CREATE TABLE IF NOT EXISTS public.knowledge_base_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.knowledge_base_posts(id) ON DELETE CASCADE,
  user_ip TEXT NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX idx_kb_ratings_post_id ON public.knowledge_base_ratings(post_id);
CREATE INDEX idx_kb_ratings_user_ip ON public.knowledge_base_ratings(user_ip);

-- RLS para avaliações (público pode inserir e visualizar)
ALTER TABLE public.knowledge_base_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can rate articles"
ON public.knowledge_base_ratings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view ratings"
ON public.knowledge_base_ratings
FOR SELECT
USING (true);

-- Tabela de comentários/dúvidas nos artigos
CREATE TABLE IF NOT EXISTS public.knowledge_base_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.knowledge_base_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  comment TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_kb_comments_post_id ON public.knowledge_base_comments(post_id);
CREATE INDEX idx_kb_comments_approved ON public.knowledge_base_comments(is_approved);

-- RLS para comentários
ALTER TABLE public.knowledge_base_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create comments"
ON public.knowledge_base_comments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view approved comments"
ON public.knowledge_base_comments
FOR SELECT
USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all comments"
ON public.knowledge_base_comments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_kb_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_kb_comments_updated_at
BEFORE UPDATE ON public.knowledge_base_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_kb_comments_updated_at();

-- Adicionar campos para SEO na tabela de posts (se ainda não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base_posts' 
                 AND column_name = 'meta_title') THEN
    ALTER TABLE public.knowledge_base_posts 
    ADD COLUMN meta_title TEXT,
    ADD COLUMN meta_description TEXT,
    ADD COLUMN meta_keywords TEXT[];
  END IF;
END $$;