-- Creare bucket pentru CV-uri (privat, acces doar prin signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false,
  20971520,  -- 20 MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Politică: utilizatorii autentificați pot upload
CREATE POLICY "Auth users can upload CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cvs');

-- Politică: utilizatorii autentificați pot citi (pentru signed URLs)
CREATE POLICY "Auth users can read CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cvs');

-- Politică: utilizatorii autentificați pot șterge
CREATE POLICY "Auth users can delete CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvs');
