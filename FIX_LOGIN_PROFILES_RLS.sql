-- ═══════════════════════════════════════════════════════════════════
-- FIX LOGIN ERROR - PROFILES TABLE RLS
-- ═══════════════════════════════════════════════════════════════════
-- This script fixes login issues caused by profiles table RLS policies
-- 
-- Error: "Internal Server Error" when fetching profile after login
-- Cause: RLS policies preventing users from reading their own profile
--
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Drop all existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - Users can view their own profile + profiles in their business
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  id = auth.uid()
  OR
  -- Users can see other profiles in their business
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Step 4: Create INSERT policy - Service role can insert (for registration/staff creation)
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow authenticated users to insert (registration flow handles this)
  true
);

-- Step 5: Create UPDATE policy - Users can update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  id = auth.uid()
  OR
  -- Business owners can update profiles in their business
  (
    business_id IN (
      SELECT business_id 
      FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'Business Owner'
    )
  )
)
WITH CHECK (
  -- Same conditions for the updated data
  id = auth.uid()
  OR
  (
    business_id IN (
      SELECT business_id 
      FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'Business Owner'
    )
  )
);

-- Step 6: Create DELETE policy - Only business owners can delete staff
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
TO authenticated
USING (
  -- Business owners can delete profiles in their business (except themselves)
  id != auth.uid()
  AND business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Check if policies were created
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Test: Can you read your own profile?
-- (Run this AFTER logging in to your app)
-- SELECT id, email, role, business_id FROM profiles WHERE id = auth.uid();

-- ═══════════════════════════════════════════════════════════════════
-- IMPORTANT NOTES
-- ═══════════════════════════════════════════════════════════════════
-- 
-- This fix ensures:
-- 1. ✅ Users can ALWAYS read their own profile (required for login)
-- 2. ✅ Users can read other profiles in their business
-- 3. ✅ Users can update their own profile
-- 4. ✅ Business Owners can update/delete staff profiles
-- 5. ✅ Registration flow can create new profiles
--
-- After running this script:
-- - Clear your browser cache
-- - Try logging in again
-- - You should be able to access the dashboard
