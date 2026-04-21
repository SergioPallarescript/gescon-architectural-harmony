
-- Drop the existing broad SELECT policy
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

-- Accepted members: everyone in the project can see
CREATE POLICY "Members can view accepted members"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  (status = 'accepted')
  AND (is_project_creator(auth.uid(), project_id) OR is_project_member(auth.uid(), project_id))
);

-- Pending invitations: only project creator, project admin, or the invitee themselves can see
CREATE POLICY "Admins can view pending invitations"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  (status <> 'accepted')
  AND (
    is_project_creator(auth.uid(), project_id)
    OR is_project_admin(auth.uid(), project_id)
    OR is_platform_admin(auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
