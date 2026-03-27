-- Delete old CFO items that have wrong structure (allowed_roles empty, item_number 0)
DELETE FROM public.cfo_items WHERE allowed_roles = '{}' OR item_number = 0 OR item_number IS NULL;

-- Add storage DELETE policy
CREATE POLICY "Members can delete plan files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'plans');

-- Add storage UPDATE policy
CREATE POLICY "Members can update plan files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'plans');