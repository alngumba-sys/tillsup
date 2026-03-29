-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS - NON-RECURSIVE FIX
-- ═══════════════════════════════════════════════════════════════════
-- Fixes the "infinite recursion detected in policy" error (42P17)
-- by avoiding self-referencing queries in RLS policies.
--
-- Strategy: Use a separate lookup table or simplified logic
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- SOLUTION: Create a helper function to get user's business and role
-- This breaks the recursion by using a security definer function
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Create NON-RECURSIVE policies using the helper functions
-- ═══════════════════════════════════════════════════════════════════

-- 1. SELECT: Allow users to view profiles in their business
CREATE POLICY "Users can view profiles in their business"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile (breaks recursion)
  id = auth.uid()
  OR
  -- Users can see profiles in their business
  business_id = public.get_my_business_id()
);

-- 2. INSERT: Allow Business Owners and Managers to create staff profiles
CREATE POLICY "Admins can create staff profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to create their own profile (for registration)
  id = auth.uid()
  OR
  -- Allow Business Owners and Managers to create staff in their business
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
);

-- 3. UPDATE: Allow users to update their own profile and admins to update staff
CREATE POLICY "Users and admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
);

-- 4. DELETE: Allow Business Owners to delete staff profiles
CREATE POLICY "Business Owners can delete staff"
ON public.profiles FOR DELETE
TO authenticated
USING (
  business_id = public.get_my_business_id()
  AND public.get_my_role() = 'Business Owner'
  AND id != auth.uid() -- Cannot delete yourself
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Ensure RLS is enabled and permissions are granted
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Check the policies
SELECT 
    policyname,
    cmd as operation,
    CASE 
      WHEN cmd = 'SELECT' THEN 'Read'
      WHEN cmd = 'INSERT' THEN 'Create'
      WHEN cmd = 'UPDATE' THEN 'Update'
      WHEN cmd = 'DELETE' THEN 'Delete'
    END as action
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Check the helper functions
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_my_business_id', 'get_my_role');
