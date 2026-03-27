
CREATE TABLE public.gantt_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gantt_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view gantt milestones"
  ON public.gantt_milestones FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can insert gantt milestones"
  ON public.gantt_milestones FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can update gantt milestones"
  ON public.gantt_milestones FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));

CREATE POLICY "Members can delete gantt milestones"
  ON public.gantt_milestones FOR DELETE TO authenticated
  USING (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id));
