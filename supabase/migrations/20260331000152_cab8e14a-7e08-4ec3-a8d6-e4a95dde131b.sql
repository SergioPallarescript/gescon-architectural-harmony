
-- Add fiscal data columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dni_cif text,
ADD COLUMN IF NOT EXISTS fiscal_address text;

-- Add cover_image_url to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS cover_image_url text;
