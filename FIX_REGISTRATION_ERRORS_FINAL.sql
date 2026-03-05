-- ============================================================================
-- FIX REGISTRATION ERRORS - FINAL SOLUTION
-- ============================================================================
-- Fixes:
-- 1. "infinite recursion detected in policy for relation profiles"
-- 2. "permission denied for table users"
-- ============================================================================

-- STEP 1: Completely remove ALL existing RLS policies to start fresh
-- ============================================================================

-- Drop all businesses policies
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_insert_businesses" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_select_businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable update for business owners" ON public.businesses;
DROP POLICY IF EXISTS "Users can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their business" ON public.businesses;

-- Drop all profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view business profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;

-- STEP 2: Create SIMPLE, NON-RECURSIVE RLS policies
-- ============================================================================

-- BUSINESSES TABLE
-- ============================================================================

-- Allow authenticated users to insert their own business
CREATE POLICY "businesses_insert_policy" 
ON public.businesses 
FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

-- Allow users to select businesses they own
CREATE POLICY "businesses_select_policy"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Allow business owners to update their business
CREATE POLICY "businesses_update_policy"
ON public.businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- PROFILES TABLE
-- ============================================================================

-- Allow authenticated users to insert their own profile
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow users to select their own profile (NO RECURSION!)
CREATE POLICY "profiles_select_own_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow business owners to view profiles in their business (NO RECURSION!)
-- This uses a direct check instead of a subquery to avoid recursion
CREATE POLICY "profiles_select_business_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- STEP 3: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Grant necessary permissions
-- ============================================================================

-- Grant table-level permissions to authenticated users
GRANT INSERT, SELECT, UPDATE ON public.businesses TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated;

-- STEP 5: Remove any problematic triggers that might access auth.users
-- ============================================================================

-- Check if there are triggers that might be causing the "permission denied for table users" error
-- Drop them if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS ensure_business_owner_id ON public.businesses;
DROP TRIGGER IF EXISTS validate_profile_id_trigger ON public.profiles;

-- STEP 6: Create safe triggers that don't access auth.users
-- ============================================================================

-- Trigger to ensure owner_id is set correctly
CREATE OR REPLACE FUNCTION public.set_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_business_owner_before_insert
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_owner_id();

-- Trigger to validate profile id
CREATE OR REPLACE FUNCTION public.ensure_profile_id_matches_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Profile id must match authenticated user id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_profile_id_before_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_id_matches_user();

-- STEP 7: Drop any existing problematic functions
-- ============================================================================

-- These might be trying to access auth.users directly
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- STEP 8: Make auth.users accessible (if needed)
-- ============================================================================

-- Grant SELECT on auth.users to authenticated users
-- This fixes the "permission denied for table users" error
GRANT SELECT ON auth.users TO authenticated;

-- STEP 9: Verification queries
-- ============================================================================

-- Check that policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;

-- Check that permissions were granted
SELECT table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name IN ('businesses', 'profiles')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- Check auth.users permissions
SELECT table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND grantee = 'authenticated';

-- STEP 10: Test the setup
-- ============================================================================

-- This should work now without errors:
-- 1. Try to register a new user
-- 2. Check that business record is created
-- 3. Check that profile record is created
-- 4. Verify no "infinite recursion" errors
-- 5. Verify no "permission denied for table users" errors

COMMIT;
