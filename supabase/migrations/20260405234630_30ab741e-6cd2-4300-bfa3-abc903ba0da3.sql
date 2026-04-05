
-- Table for subcontracting book diligencia (one per project)
CREATE TABLE public.subcontracting_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rea_number text NOT NULL,
  apertura_number text NOT NULL,
  habilitacion_cause text NOT NULL DEFAULT 'nueva_obra',
  last_annotation_number text,
  diligencia_generated_at timestamptz,
  sealed_file_path text,
  sealed_file_name text,
  is_activated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Table for subcontractor entries
CREATE TABLE public.subcontracting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.subcontracting_books(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_number serial,
  empresa_nombre text NOT NULL,
  empresa_nif text NOT NULL,
  nivel_subcontratacion integer NOT NULL DEFAULT 1,
  comitente_entry_id uuid REFERENCES public.subcontracting_entries(id),
  objeto_contrato text NOT NULL,
  fecha_comienzo date NOT NULL,
  responsable_nombre text NOT NULL,
  responsable_dni text NOT NULL,
  fecha_plan_seguridad date,
  instrucciones_seguridad text,
  signature_hash text,
  signature_geo text,
  signature_type text,
  signature_image text,
  signed_by uuid,
  signed_at timestamptz,
  is_locked boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subcontracting_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontracting_entries ENABLE ROW LEVEL SECURITY;

-- Books policies
CREATE POLICY "Members can view subcontracting books"
ON public.subcontracting_books FOR SELECT TO authenticated
USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "CON can create subcontracting books"
ON public.subcontracting_books FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id)));

CREATE POLICY "CON can update subcontracting books"
ON public.subcontracting_books FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- Entries policies
CREATE POLICY "Members can view subcontracting entries"
ON public.subcontracting_entries FOR SELECT TO authenticated
USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "CON can create subcontracting entries"
ON public.subcontracting_entries FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id)));

CREATE POLICY "CON can update subcontracting entries"
ON public.subcontracting_entries FOR UPDATE TO authenticated
USING (created_by = auth.uid());
