
-- Helper function to extract project_id from storage path
-- Pattern 1: {uuid}/... -> first segment is project_id
-- Pattern 2: {prefix}/{uuid}/... -> second segment is project_id  
-- Pattern 3: root files (e.g. tectra-logo.png) -> no project_id
CREATE OR REPLACE FUNCTION public.extract_project_id_from_path(file_path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  segments text[];
  seg1 text;
  seg2 text;
  uuid_pattern text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  segments := string_to_array(file_path, '/');
  seg1 := segments[1];
  
  -- If first segment is a UUID, it's the project_id
  IF seg1 ~ uuid_pattern THEN
    RETURN seg1::uuid;
  END IF;
  
  -- Otherwise check second segment
  seg2 := segments[2];
  IF seg2 IS NOT NULL AND seg2 ~ uuid_pattern THEN
    RETURN seg2::uuid;
  END IF;
  
  -- No project_id found (root files like logo)
  RETURN NULL;
END;
$$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Plans bucket: members can read" ON storage.objects;
DROP POLICY IF EXISTS "Plans bucket: members can upload" ON storage.objects;
DROP POLICY IF EXISTS "Plans bucket: members can update" ON storage.objects;
DROP POLICY IF EXISTS "Plans bucket: members can delete" ON storage.objects;

-- New policies using the helper function
CREATE POLICY "Plans bucket: members can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plans'
  AND (
    extract_project_id_from_path(name) IS NULL
    OR is_project_member(auth.uid(), extract_project_id_from_path(name))
    OR is_project_creator(auth.uid(), extract_project_id_from_path(name))
  )
);

CREATE POLICY "Plans bucket: members can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'plans'
  AND (
    extract_project_id_from_path(name) IS NOT NULL
    AND (
      is_project_member(auth.uid(), extract_project_id_from_path(name))
      OR is_project_creator(auth.uid(), extract_project_id_from_path(name))
    )
  )
);

CREATE POLICY "Plans bucket: members can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'plans'
  AND (
    extract_project_id_from_path(name) IS NOT NULL
    AND (
      is_project_member(auth.uid(), extract_project_id_from_path(name))
      OR is_project_creator(auth.uid(), extract_project_id_from_path(name))
    )
  )
);

CREATE POLICY "Plans bucket: members can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'plans'
  AND (
    extract_project_id_from_path(name) IS NOT NULL
    AND (
      is_project_member(auth.uid(), extract_project_id_from_path(name))
      OR is_project_creator(auth.uid(), extract_project_id_from_path(name))
    )
  )
);
