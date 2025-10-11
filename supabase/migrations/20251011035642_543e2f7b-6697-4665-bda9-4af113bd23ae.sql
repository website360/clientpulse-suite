-- Create knowledge base categories table
CREATE TABLE public.knowledge_base_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#1E40AF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create knowledge base posts table
CREATE TABLE public.knowledge_base_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  category_id UUID REFERENCES public.knowledge_base_categories(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Everyone can view active categories"
ON public.knowledge_base_categories
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage categories"
ON public.knowledge_base_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for posts
CREATE POLICY "Everyone can view published posts"
ON public.knowledge_base_posts
FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage posts"
ON public.knowledge_base_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_knowledge_base_categories_updated_at
BEFORE UPDATE ON public.knowledge_base_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_posts_updated_at
BEFORE UPDATE ON public.knowledge_base_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_kb_posts_category ON public.knowledge_base_posts(category_id);
CREATE INDEX idx_kb_posts_published ON public.knowledge_base_posts(is_published, published_at DESC);
CREATE INDEX idx_kb_posts_slug ON public.knowledge_base_posts(slug);
CREATE INDEX idx_kb_categories_slug ON public.knowledge_base_categories(slug);