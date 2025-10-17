-- Modify notes table to support multiple images as JSON array
-- First, we'll rename the current column and create a new one
ALTER TABLE public.notes 
  RENAME COLUMN image_url TO image_url_old;

-- Add new column for array of image URLs
ALTER TABLE public.notes 
  ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single image URLs to array format
UPDATE public.notes 
SET image_urls = CASE 
  WHEN image_url_old IS NOT NULL THEN jsonb_build_array(image_url_old)
  ELSE '[]'::jsonb
END;

-- Drop old column
ALTER TABLE public.notes 
  DROP COLUMN image_url_old;