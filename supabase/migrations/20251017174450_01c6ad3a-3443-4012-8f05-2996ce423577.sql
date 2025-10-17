-- Create enum for note types
CREATE TYPE note_type AS ENUM ('text', 'link', 'image');

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  note_type note_type NOT NULL DEFAULT 'text',
  link_url TEXT,
  image_url TEXT,
  color TEXT NOT NULL DEFAULT '#fef08a',
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER DEFAULT 280,
  height INTEGER DEFAULT 280,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notes"
ON public.notes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-images', 'note-images', false);

-- Storage policies for note images
CREATE POLICY "Users can upload their own note images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own note images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own note images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own note images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all note images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'note-images' 
  AND has_role(auth.uid(), 'admin')
);