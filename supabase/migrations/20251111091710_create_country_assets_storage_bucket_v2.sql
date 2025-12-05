/*
  # Create Country Assets Storage Bucket

  ## New Storage Bucket
  - `country-assets` bucket for storing country-specific logos and favicons
  
  ## Storage Structure
  - country-assets/COUNTRY_CODE/logo.png
  - country-assets/COUNTRY_CODE/favicon.png
  
  ## Security (RLS Policies)
  - Public read access for all files (needed to display logos/favicons)
  - Master admin only for upload, update, and delete operations
  
  ## File Restrictions
  - Allowed MIME types: image/png, image/jpeg, image/jpg, image/svg+xml
  - Maximum file size: 10MB
*/

-- Create the bucket for country assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'country-assets',
  'country-assets',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

-- Note: Storage RLS policies must be created via Supabase Dashboard's Storage section
-- The following policies should be manually configured in the dashboard:
--
-- 1. Policy Name: "Public can view country assets"
--    Operation: SELECT
--    Policy Definition: bucket_id = 'country-assets'
--
-- 2. Policy Name: "Master admin can upload country assets"  
--    Operation: INSERT
--    Policy Definition: (bucket_id = 'country-assets') AND (auth.uid() IN (SELECT id FROM users WHERE role = 'master_admin'))
--
-- 3. Policy Name: "Master admin can update country assets"
--    Operation: UPDATE  
--    Policy Definition: (bucket_id = 'country-assets') AND (auth.uid() IN (SELECT id FROM users WHERE role = 'master_admin'))
--
-- 4. Policy Name: "Master admin can delete country assets"
--    Operation: DELETE
--    Policy Definition: (bucket_id = 'country-assets') AND (auth.uid() IN (SELECT id FROM users WHERE role = 'master_admin'))
