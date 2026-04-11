
-- Add columns for folder structure and custom slots
ALTER TABLE public.cfo_items 
ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS folder_index integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_by_user uuid;
