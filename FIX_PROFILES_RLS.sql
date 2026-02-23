-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS POLICY COMPLETE RESET
-- ═══════════════════════════════════════════════════════════════════
-- Run this to fix the 403 error when creating staff members.
-- 
-- This script:
-- 1. Drops ALL existing policies on profiles table
-- 2. Creates new policies that allow Business Owners and Managers to create staff
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Drop ALL existing policies on profiles table
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

-- STEP 2: Create new comprehensive policies

-- 1. SELECT: Allow users to view profiles in their business
CREATE POLICY "Users can view profiles in their business"
ON public.profiles FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 2. INSERT: Allow Business Owners and Managers to create staff profiles
-- Also allow users to create their own profile during registration
CREATE POLICY "Admins can create staff profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to create their own profile (for registration)
  id = auth.uid()
  OR
  -- Allow Business Owners and Managers to create staff profiles
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role IN ('Business Owner', 'Manager')
  )
);

-- 3. UPDATE: Allow users to update their own profile
-- Also allow Business Owners and Managers to update staff profiles
CREATE POLICY "Users and admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role IN ('Business Owner', 'Manager')
  )
);

-- 4. DELETE: Allow Business Owners to delete staff profiles
CREATE POLICY "Business Owners can delete staff"
ON public.profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role = 'Business Owner'
  )
  AND id != auth.uid() -- Cannot delete yourself
);

-- STEP 3: Verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════
-- Run these to verify the policies are in place:

-- 1. Check all policies on profiles table
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
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';
