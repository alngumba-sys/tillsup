-- ============================================
-- STORAGE DIAGNOSTIC & SETUP SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to diagnose and fix storage issues

-- 1. Check if Inventoryimages bucket exists
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets 
WHERE id = 'Inventoryimages';

-- If the above returns no rows, the bucket doesn't exist!
-- Create it with:

INSERT INTO storage.buckets (id, name, public)
VALUES ('Inventoryimages', 'Inventoryimages', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Check existing RLS policies on the bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
  AND policyname LIKE '%Inventory%';

-- 3. Set up RLS policies for authenticated users
-- Allow INSERT (upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to upload inventory images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload inventory images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'Inventoryimages');
  END IF;
END $$;

-- Allow SELECT (view/download)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow public to view inventory images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow public to view inventory images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'Inventoryimages');
  END IF;
END $$;

-- Allow UPDATE (modify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to update inventory images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated users to update inventory images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'Inventoryimages')
    WITH CHECK (bucket_id = 'Inventoryimages');
  END IF;
END $$;

-- Allow DELETE (remove)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to delete inventory images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete inventory images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'Inventoryimages');
  END IF;
END $$;

-- 4. Verify setup
SELECT 'Bucket Status:' as check_type, 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'Inventoryimages') 
    THEN '✅ Bucket exists' 
    ELSE '❌ Bucket NOT found - run the INSERT above'
  END as status
UNION ALL
SELECT 'Public Access:' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'Inventoryimages' AND public = true) 
    THEN '✅ Public access enabled' 
    ELSE '⚠️ Bucket is private'
  END as status
UNION ALL
SELECT 'RLS Policies:' as check_type,
  COUNT(*)::text || ' policies found' as status
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%inventory images%';

-- 5. Test upload permissions
-- This will show if the current user can upload
SELECT 
  'Upload Test:' as test,
  CASE 
    WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
    THEN '✅ User is authenticated - should be able to upload'
    WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'anon'
    THEN '⚠️ User is anonymous - needs to login'
    ELSE '❌ No auth token - user not logged in'
  END as status;
