
-- Increase storage bucket file size limit to 50MB
UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'plans';
