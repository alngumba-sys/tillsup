-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS - FINAL FIX FOR 42501 ERROR
-- ═══════════════════════════════════════════════════════════════════
-- This fixes the "new row violates row-level security policy" error
-- by using clearer table aliases and logic in the RLS policies.
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Drop ALL existing policies
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

-- STEP 2: Create new policies with clear table aliases

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
CREATE POLICY "Admins can create staff profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to create their own profile (for registration)
  id = auth.uid()
  OR
  -- Allow Business Owners and Managers to create staff profiles in their business
  business_id IN (
    SELECT p.business_id 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('Business Owner', 'Manager')
  )
);

-- 3. UPDATE: Allow users to update their own profile
CREATE POLICY "Users and admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  business_id IN (
    SELECT p.business_id 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  -- User can update their own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can update profiles in their business
  business_id IN (
    SELECT p.business_id 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('Business Owner', 'Manager')
  )
);

-- 4. DELETE: Allow Business Owners to delete staff profiles
CREATE POLICY "Business Owners can delete staff"
ON public.profiles FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT p.business_id 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'Business Owner'
  )
  AND id != auth.uid() -- Cannot delete yourself
);

-- STEP 3: Ensure RLS is enabled and permissions are granted
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;
