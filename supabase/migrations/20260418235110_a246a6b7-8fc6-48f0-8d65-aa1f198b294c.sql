-- Create cfo_item_files table for multi-file slots
CREATE TABLE public.cfo_item_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cfo_item_id UUID NOT NULL REFERENCES public.cfo_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  custom_title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfo_item_files_item ON public.cfo_item_files(cfo_item_id, sort_order);
CREATE INDEX idx_cfo_item_files_project ON public.cfo_item_files(project_id);

-- Enable RLS
ALTER TABLE public.cfo_item_files ENABLE ROW LEVEL SECURITY;

-- Policies: project members can manage files
CREATE POLICY "Members can view cfo files"
ON public.cfo_item_files FOR SELECT
TO authenticated
USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can insert cfo files"
ON public.cfo_item_files FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id))
);

CREATE POLICY "Members can update cfo files"
ON public.cfo_item_files FOR UPDATE
TO authenticated
USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can delete cfo files"
ON public.cfo_item_files FOR DELETE
TO authenticated
USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_cfo_item_files_updated_at
BEFORE UPDATE ON public.cfo_item_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-migrate existing files from cfo_items.file_url into the new table
INSERT INTO public.cfo_item_files (cfo_item_id, project_id, custom_title, file_name, file_url, sort_order, uploaded_by)
SELECT
  ci.id,
  ci.project_id,
  COALESCE(NULLIF(TRIM(ci.file_name), ''), 'Documento sin título'),
  COALESCE(NULLIF(TRIM(ci.file_name), ''), 'archivo'),
  ci.file_url,
  0,
  COALESCE(ci.completed_by, ci.created_by_user, (SELECT created_by FROM public.projects WHERE id = ci.project_id))
FROM public.cfo_items ci
WHERE ci.file_url IS NOT NULL
  AND ci.file_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.cfo_item_files f WHERE f.cfo_item_id = ci.id
  );