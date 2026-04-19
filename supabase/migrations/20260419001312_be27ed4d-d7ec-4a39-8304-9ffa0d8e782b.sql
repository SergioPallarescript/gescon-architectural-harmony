-- Tabla de datos estructurados Volumen 1
CREATE TABLE public.cfo_volume1_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Identificación
  municipio TEXT,
  municipio_ai BOOLEAN NOT NULL DEFAULT false,
  emplazamiento TEXT,
  emplazamiento_ai BOOLEAN NOT NULL DEFAULT false,
  codigo_postal TEXT,
  codigo_postal_ai BOOLEAN NOT NULL DEFAULT false,
  nrc TEXT,
  nrc_ai BOOLEAN NOT NULL DEFAULT false,
  
  -- Registro de la Propiedad
  registro_numero TEXT,
  registro_numero_ai BOOLEAN NOT NULL DEFAULT false,
  tomo TEXT,
  tomo_ai BOOLEAN NOT NULL DEFAULT false,
  libro TEXT,
  libro_ai BOOLEAN NOT NULL DEFAULT false,
  folio TEXT,
  folio_ai BOOLEAN NOT NULL DEFAULT false,
  finca TEXT,
  finca_ai BOOLEAN NOT NULL DEFAULT false,
  
  -- Seguros
  poliza_decenal_compania TEXT,
  poliza_decenal_compania_ai BOOLEAN NOT NULL DEFAULT false,
  poliza_decenal_numero TEXT,
  poliza_decenal_numero_ai BOOLEAN NOT NULL DEFAULT false,
  
  -- Superficies y unidades
  superficie_parcela NUMERIC,
  superficie_parcela_ai BOOLEAN NOT NULL DEFAULT false,
  superficie_construida NUMERIC,
  superficie_construida_ai BOOLEAN NOT NULL DEFAULT false,
  superficie_util NUMERIC,
  superficie_util_ai BOOLEAN NOT NULL DEFAULT false,
  numero_viviendas INTEGER,
  numero_viviendas_ai BOOLEAN NOT NULL DEFAULT false,
  numero_plantas INTEGER,
  numero_plantas_ai BOOLEAN NOT NULL DEFAULT false,
  
  -- Cronología
  fecha_licencia_obra DATE,
  fecha_licencia_obra_ai BOOLEAN NOT NULL DEFAULT false,
  numero_licencia_obra TEXT,
  numero_licencia_obra_ai BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio_obra DATE,
  fecha_inicio_obra_ai BOOLEAN NOT NULL DEFAULT false,
  fecha_fin_obra DATE,
  fecha_fin_obra_ai BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  last_ai_scan_at TIMESTAMPTZ,
  last_ai_scan_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cfo_volume1_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view volume1 data"
  ON public.cfo_volume1_data FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can insert volume1 data"
  ON public.cfo_volume1_data FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can update volume1 data"
  ON public.cfo_volume1_data FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Admins can delete volume1 data"
  ON public.cfo_volume1_data FOR DELETE TO authenticated
  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER update_cfo_volume1_data_updated_at
  BEFORE UPDATE ON public.cfo_volume1_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de borradores L/I/N/R (Limpieza, Inspección, Normas, Reparación)
CREATE TABLE public.cfo_lir_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Material/elemento detectado por IA
  material_key TEXT NOT NULL, -- p.ej. "carpinteria_aluminio", "cubierta_teja", "fachada_ladrillo"
  material_label TEXT NOT NULL, -- texto legible
  category TEXT NOT NULL, -- "carpinteria" | "estructura" | "cubierta" | "fachada" | "instalaciones" | "otros"
  
  -- Borradores L/I/N/R
  limpieza TEXT,
  inspeccion TEXT,
  normas_uso TEXT,
  reparacion TEXT,
  
  -- Estado de validación por la DF
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (project_id, material_key)
);

ALTER TABLE public.cfo_lir_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lir drafts"
  ON public.cfo_lir_drafts FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can insert lir drafts"
  ON public.cfo_lir_drafts FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can update lir drafts"
  ON public.cfo_lir_drafts FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Admins can delete lir drafts"
  ON public.cfo_lir_drafts FOR DELETE TO authenticated
  USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER update_cfo_lir_drafts_updated_at
  BEFORE UPDATE ON public.cfo_lir_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cfo_lir_drafts_project ON public.cfo_lir_drafts(project_id);
CREATE INDEX idx_cfo_volume1_data_project ON public.cfo_volume1_data(project_id);