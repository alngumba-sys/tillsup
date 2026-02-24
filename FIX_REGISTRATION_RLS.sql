-- ============================================================================
-- FIX REGISTRATION ERROR: "permission denied for table users"
-- ============================================================================
-- This SQL fixes the RLS policies that prevent new users from registering
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- STEP 1: Fix businesses table RLS policies
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_insert_businesses" ON public.businesses;

-- Create a comprehensive insert policy for businesses
CREATE POLICY "authenticated_insert_businesses" 
ON public.businesses 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Allow if the owner_id matches the authenticated user
  owner_id = auth.uid()
);

-- Ensure businesses table has proper SELECT policy
DROP POLICY IF EXISTS "authenticated_select_businesses" ON public.businesses;
CREATE POLICY "authenticated_select_businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- STEP 2: Fix profiles table RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;

-- Create a comprehensive insert policy for profiles
CREATE POLICY "authenticated_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if the profile id matches the authenticated user
  id = auth.uid()
);

-- Ensure profiles table has proper SELECT policy
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
CREATE POLICY "authenticated_select_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- STEP 3: Ensure RLS is properly enabled
-- ============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Grant necessary permissions to authenticated users
-- ============================================================================

GRANT INSERT ON public.businesses TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.businesses TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT UPDATE ON public.businesses TO authenticated;

-- STEP 5: Create trigger to ensure owner_id is set correctly (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id is not set or is NULL, set it to the current user
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS ensure_business_owner_id ON public.businesses;
CREATE TRIGGER ensure_business_owner_id
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_owner_id();

-- STEP 6: Create trigger to ensure profile id matches auth.uid()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the profile id matches the authenticated user
  IF NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Profile id must match authenticated user id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_profile_id_trigger ON public.profiles;
CREATE TRIGGER validate_profile_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_id();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the policies are in place:

-- Check businesses policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'businesses';

-- Check profiles policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Check table permissions
SELECT table_name, privilege_type, grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name IN ('businesses', 'profiles')
AND grantee = 'authenticated';

-- ============================================================================
-- TESTING
-- ============================================================================
-- After running this script:
-- 1. Try registering a new user
-- 2. Check the browser console for any errors
-- 3. Verify in Supabase Table Editor that new records are created
-- ============================================================================

COMMIT;
