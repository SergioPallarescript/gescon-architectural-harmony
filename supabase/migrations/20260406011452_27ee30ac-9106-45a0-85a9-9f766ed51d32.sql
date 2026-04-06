ALTER TABLE public.subcontracting_books
ADD COLUMN IF NOT EXISTS promoter_name text,
ADD COLUMN IF NOT EXISTS promoter_nif text,
ADD COLUMN IF NOT EXISTS contractor_name text,
ADD COLUMN IF NOT EXISTS contractor_nif text,
ADD COLUMN IF NOT EXISTS facultative_direction_name text,
ADD COLUMN IF NOT EXISTS facultative_direction_nif text,
ADD COLUMN IF NOT EXISTS css_name text,
ADD COLUMN IF NOT EXISTS css_nif text,
ADD COLUMN IF NOT EXISTS site_address text,
ADD COLUMN IF NOT EXISTS site_locality text;

ALTER TABLE public.brain_messages
ADD COLUMN IF NOT EXISTS conversation_id uuid,
ADD COLUMN IF NOT EXISTS conversation_title text;

CREATE INDEX IF NOT EXISTS idx_brain_messages_project_user_conversation_created_at
ON public.brain_messages (project_id, user_id, conversation_id, created_at);

DROP POLICY IF EXISTS "Members can view brain messages" ON public.brain_messages;
CREATE POLICY "Users can view own brain messages"
ON public.brain_messages
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id))
);

DROP POLICY IF EXISTS "Users can insert brain messages" ON public.brain_messages;
CREATE POLICY "Users can create own brain messages"
ON public.brain_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (is_project_member(auth.uid(), project_id) OR is_project_creator(auth.uid(), project_id))
);