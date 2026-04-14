
ALTER TABLE public.cfo_items
  ADD COLUMN IF NOT EXISTS slot_type text NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_content text,
  ADD COLUMN IF NOT EXISTS volume integer NOT NULL DEFAULT 1;
