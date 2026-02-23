-- 1. Create the storage buckets if they don't exist
-- We use a DO block or standard inserts to ensure this runs smoothly

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('Inventoryimages', 'Inventoryimages', true, 5242880, '{image/*}')
ON CONFLICT (id) DO UPDATE SET
public = true,
file_size_limit = 5242880,
allowed_mime_types = '{image/*}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (standard)
-- REMOVED: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- (This table already has RLS enabled by default in Supabase, and re-enabling it requires ownership)

-- 3. DROP ALL EXISTING POLICIES FOR THESE BUCKETS TO AVOID CONFLICTS
-- Inventoryimages
DROP POLICY IF EXISTS "Inventoryimages Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Inventoryimages Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Inventoryimages Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Inventoryimages Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Inventoryimages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload Inventoryimages" ON storage.objects;

-- Platform Assets
DROP POLICY IF EXISTS "PlatformAssets Public Select" ON storage.objects;
DROP POLICY IF EXISTS "PlatformAssets Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "PlatformAssets Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "PlatformAssets Auth Delete" ON storage.objects;

-- 4. CREATE NEW ROBUST POLICIES

-- A) Inventoryimages Policies
-- Allow anyone (public) to view images
CREATE POLICY "Inventoryimages Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'Inventoryimages' );

-- Allow authenticated users to upload
CREATE POLICY "Inventoryimages Auth Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'Inventoryimages' );

-- Allow authenticated users to update their own uploads OR all uploads in this bucket (simplified for this app)
CREATE POLICY "Inventoryimages Auth Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'Inventoryimages' );

-- Allow authenticated users to delete
CREATE POLICY "Inventoryimages Auth Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'Inventoryimages' );

-- B) Platform Assets Policies
CREATE POLICY "PlatformAssets Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'platform-assets' );

CREATE POLICY "PlatformAssets Auth Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'platform-assets' );

CREATE POLICY "PlatformAssets Auth Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'platform-assets' );

CREATE POLICY "PlatformAssets Auth Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'platform-assets' );

-- 5. GRANT PERMISSIONS
-- Grant specific DML permissions instead of ALL
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.buckets TO authenticated;
