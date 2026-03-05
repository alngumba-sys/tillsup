-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS - COMPLETE BYPASS FIX
-- ═══════════════════════════════════════════════════════════════════
-- Fixes infinite recursion by using plpgsql functions that explicitly
-- disable RLS during lookup
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

-- STEP 2: Drop old functions if they exist
DROP FUNCTION IF EXISTS public.get_my_business_id();
DROP FUNCTION IF EXISTS public.get_my_role();

-- ═══════════════════════════════════════════════════════════════════
-- Create helper functions that BYPASS RLS completely
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result uuid;
BEGIN
  -- Explicitly bypass RLS for this lookup
  SELECT business_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  -- Explicitly bypass RLS for this lookup
  SELECT role INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_business_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Create SIMPLE policies that don't query profiles table
-- ═══════════════════════════════════════════════════════════════════

-- CRITICAL: For SELECT, we must allow reading your own profile first
-- This is the BASE CASE that breaks recursion
CREATE POLICY "Allow own profile read"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Then allow reading other profiles in same business
CREATE POLICY "Allow business profiles read"
ON public.profiles FOR SELECT
TO authenticated
USING (
  business_id = public.get_my_business_id()
);

-- INSERT: Allow creating own profile + staff creation by admins
CREATE POLICY "Allow profile creation"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow creating own profile
  id = auth.uid()
  OR
  -- Allow Business Owners and Managers to create staff
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
);

-- UPDATE: Allow updating own profile + staff updates by admins
CREATE POLICY "Allow profile updates"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  id = auth.uid()
  OR
  (
    business_id = public.get_my_business_id()
    AND public.get_my_role() IN ('Business Owner', 'Manager')
  )
);

-- DELETE: Allow Business Owners to delete staff
CREATE POLICY "Allow staff deletion"
ON public.profiles FOR DELETE
TO authenticated
USING (
  business_id = public.get_my_business_id()
  AND public.get_my_role() = 'Business Owner'
  AND id != auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Enable RLS and grant permissions
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: Test the functions work (should return your data)
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'My Business ID:' as label,
  public.get_my_business_id() as value
UNION ALL
SELECT 
  'My Role:' as label,
  public.get_my_role() as value;

-- Verify policies
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;
