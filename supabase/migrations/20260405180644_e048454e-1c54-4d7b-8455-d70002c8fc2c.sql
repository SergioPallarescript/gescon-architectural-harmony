
-- 1. Add referencia_catastral to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS referencia_catastral text;

-- 2. Create book_covers table for legal cover configuration
CREATE TABLE public.book_covers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  book_type text NOT NULL DEFAULT 'orders',
  colegio_oficial text,
  propietario_promotor text,
  directores_obra jsonb DEFAULT '[]'::jsonb,
  director_ejecucion_nombre text,
  director_ejecucion_colegiado text,
  libro_numero text,
  fecha_comienzo date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, book_type)
);

ALTER TABLE public.book_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view book covers" ON public.book_covers
  FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Admin can manage book covers" ON public.book_covers
  FOR ALL TO authenticated
  USING (is_project_creator(auth.uid(), project_id))
  WITH CHECK (is_project_creator(auth.uid(), project_id));

-- 3. Add new legal fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dirigida_a text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrita_por text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asunto text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signature_hash text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signature_geo text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signature_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signed_by uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 4. Add same legal fields to incidents table
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS dirigida_a text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escrita_por text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS asunto text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS signature_hash text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS signature_geo text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS signature_type text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS signed_by uuid;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 5. Update trigger for book_covers
CREATE TRIGGER update_book_covers_updated_at
  BEFORE UPDATE ON public.book_covers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Allow members to insert book covers too (DEM/DO)
CREATE POLICY "Members can insert book covers" ON public.book_covers
  FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can update book covers" ON public.book_covers
  FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));
