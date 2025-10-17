-- Create note_tags table
CREATE TABLE public.note_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create note_tag_relationships table
CREATE TABLE public.note_tag_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.note_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, tag_id)
);

-- Enable RLS on note_tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_tags
CREATE POLICY "Users can view their own tags"
  ON public.note_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON public.note_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.note_tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.note_tags FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tags"
  ON public.note_tags FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Enable RLS on note_tag_relationships
ALTER TABLE public.note_tag_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_tag_relationships
CREATE POLICY "Users can view relationships of their notes"
  ON public.note_tag_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tag_relationships.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create relationships for their notes"
  ON public.note_tag_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tag_relationships.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete relationships of their notes"
  ON public.note_tag_relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tag_relationships.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all relationships"
  ON public.note_tag_relationships FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Remove note_type column from notes table
ALTER TABLE public.notes DROP COLUMN IF EXISTS note_type;

-- Add trigger for note_tags updated_at
CREATE TRIGGER update_note_tags_updated_at
  BEFORE UPDATE ON public.note_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();