-- Criar tabela para rastrear a última visualização de cada ticket pelo usuário
CREATE TABLE IF NOT EXISTS public.ticket_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.ticket_views ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own ticket views"
ON public.ticket_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ticket views"
ON public.ticket_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ticket views"
ON public.ticket_views
FOR UPDATE
USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_ticket_views_ticket_user ON public.ticket_views(ticket_id, user_id);
CREATE INDEX idx_ticket_views_user ON public.ticket_views(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ticket_views_updated_at
BEFORE UPDATE ON public.ticket_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
