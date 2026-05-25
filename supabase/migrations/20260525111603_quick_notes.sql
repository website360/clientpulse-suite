-- ============================================================
-- Quick Notes (iPhone Notes-style module)
-- Folders + notes with rich text, pinning, sharing and images
-- ============================================================

-- Folders
CREATE TABLE public.quick_note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT '#64748b',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_note_folders_user ON public.quick_note_folders(user_id);
CREATE INDEX idx_quick_note_folders_shared ON public.quick_note_folders(is_shared) WHERE is_shared = true;

-- Notes
CREATE TABLE public.quick_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.quick_note_folders(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_notes_user ON public.quick_notes(user_id);
CREATE INDEX idx_quick_notes_folder ON public.quick_notes(folder_id);
CREATE INDEX idx_quick_notes_shared ON public.quick_notes(is_shared) WHERE is_shared = true;
CREATE INDEX idx_quick_notes_updated ON public.quick_notes(updated_at DESC);

-- updated_at triggers
CREATE TRIGGER update_quick_note_folders_updated_at
  BEFORE UPDATE ON public.quick_note_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_notes_updated_at
  BEFORE UPDATE ON public.quick_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.quick_note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

-- Folders: owner sees own + everyone sees shared
CREATE POLICY "View own or shared folders"
  ON public.quick_note_folders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Create own folders"
  ON public.quick_note_folders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or shared folders"
  ON public.quick_note_folders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Delete own folders"
  ON public.quick_note_folders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Notes: owner sees own + everyone sees shared
CREATE POLICY "View own or shared notes"
  ON public.quick_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Create own notes"
  ON public.quick_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or shared notes"
  ON public.quick_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Delete own notes"
  ON public.quick_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Storage bucket for inline images in notes
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quick-note-images', 'quick-note-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload quick-note images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quick-note-images');

CREATE POLICY "Anyone can view quick-note images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quick-note-images');

CREATE POLICY "Owners can update their quick-note images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quick-note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete their quick-note images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quick-note-images' AND auth.uid()::text = (storage.foldername(name))[1]);
