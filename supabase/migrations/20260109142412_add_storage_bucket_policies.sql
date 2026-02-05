/*
  # Storage Bucket Policies for Tournament Images

  1. Purpose
    - Configure RLS policies for the tournament-image-bucket storage bucket
    - Allow public read access for all users (including anonymous)
    - Restrict upload/modify/delete operations to master_admin and super_admin roles only

  2. Security Policies
    - SELECT: Public access (everyone can view images)
    - INSERT: Only master_admin and super_admin can upload
    - UPDATE: Only master_admin and super_admin can modify
    - DELETE: Only master_admin and super_admin can delete

  3. Notes
    - The bucket must already exist (created via Supabase dashboard or previous migration)
    - Policies check the authenticated user's role in the public.users table
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-image-bucket', 'tournament-image-bucket', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public read access for tournament images" ON storage.objects;
DROP POLICY IF EXISTS "Master and super admins can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Master and super admins can update images" ON storage.objects;
DROP POLICY IF EXISTS "Master and super admins can delete images" ON storage.objects;

-- SELECT policy: Allow public read access for everyone
CREATE POLICY "Public read access for tournament images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tournament-image-bucket');

-- INSERT policy: Only master_admin and super_admin can upload
CREATE POLICY "Master and super admins can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-image-bucket'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('master_admin', 'super_admin')
  )
);

-- UPDATE policy: Only master_admin and super_admin can modify
CREATE POLICY "Master and super admins can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tournament-image-bucket'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('master_admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'tournament-image-bucket'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('master_admin', 'super_admin')
  )
);

-- DELETE policy: Only master_admin and super_admin can delete
CREATE POLICY "Master and super admins can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-image-bucket'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('master_admin', 'super_admin')
  )
);